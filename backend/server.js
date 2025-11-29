/* backend/server.js */
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const redisClient = require('./redisClient');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 2006,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'webdb',
    waitForConnections: true, connectionLimit: 10
});

// [Helper] 매칭 엔진 (수량 반영)
async function matchOrders(connection, stockCode, currentPrice) {
    const [activeOrders] = await connection.query(`
        SELECT oa.*, o.account_number, o.stock_code, o.order_type, o.write_price, o.quantity 
        FROM order_active oa
        JOIN orders o ON oa.order_id = o.order_id
        WHERE o.stock_code = ?
    `, [stockCode]);

    for (const order of activeOrders) {
        let isMatch = false;
        if (order.order_type === 'BUY' && Number(order.write_price) >= currentPrice) isMatch = true;
        else if (order.order_type === 'SELL' && Number(order.write_price) <= currentPrice) isMatch = true;

        if (isMatch) {
            // [수정] 고정 10개가 아니라, 주문서의 수량(order.quantity) 사용
            const fillQty = order.quantity; 

            // 1. 포트폴리오/잔고 반영
            if (order.order_type === 'BUY') {
                // 매수 체결: 주식 지급 (돈은 이미 차감됨)
                await connection.query(`
                    INSERT INTO portfolios (account_number, stock_code, quantity, average_buy_price)
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    average_buy_price = (average_buy_price * quantity + VALUES(average_buy_price) * VALUES(quantity)) / (quantity + VALUES(quantity)),
                    quantity = quantity + VALUES(quantity)
                `, [order.account_number, order.stock_code, fillQty, currentPrice]);
            } else {
                // 매도 체결: 돈 지급 (주식은 이미 차감됨)
                const totalAmt = currentPrice * fillQty;
                await connection.query('UPDATE accounts SET cash_balance = cash_balance + ? WHERE account_number = ?', [totalAmt, order.account_number]);
            }

            // 2. 트랜잭션 기록
            await connection.query('INSERT INTO transactions (order_id, price, qty) VALUES (?, ?, ?)', [order.order_id, currentPrice, fillQty]);

            // 3. Active -> History 이동
            await connection.query('DELETE FROM order_active WHERE order_id = ?', [order.order_id]);
            await connection.query(`
                INSERT INTO order_history (order_id, order_status, final_filled_qty)
                VALUES (?, 'FILLED', ?)
            `, [order.order_id, fillQty]);
            
            console.log(`✅ 주문 체결: Order ${order.order_id}, Qty: ${fillQty}`);
        }
    }
}

// [API] 로그인
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const [users] = await pool.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    if (users.length > 0) res.json({ message: 'Success', user: users[0] });
    else res.status(401).json({ error: 'Fail' });
});

// [API] 시세 조회
app.get('/api/stocks', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const [rows] = await conn.query('SELECT * FROM stock_info');
        const stocks = await Promise.all(rows.map(async (s) => {
            const cached = await redisClient.hGetAll(`quote:${s.stock_code}`);
            let price = cached.current_price ? parseInt(cached.current_price) : 70000;
            
            price += Math.floor(price * ((Math.random() * 0.04) - 0.02));
            if(price < 100) price = 100;
            
            await redisClient.hSet(`quote:${s.stock_code}`, { current_price: price });
            await matchOrders(conn, s.stock_code, price);
            return { ...s, current_price: price };
        }));
        res.json(stocks);
    } catch(e) { res.status(500).json({error:'Err'}); }
    finally { conn.release(); }
});

// [API] 대시보드 데이터
app.get('/api/dashboard/:userId', async (req, res) => {
    try {
        const [accs] = await pool.query('SELECT * FROM accounts WHERE user_id = ?', [req.params.userId]);
        if(!accs[0]) return res.status(404).json({error:'No Account'});
        const acc = accs[0];

        const [pf] = await pool.query(`
            SELECT p.*, s.stock_name FROM portfolios p 
            JOIN stock_info s ON p.stock_code = s.stock_code 
            WHERE p.account_number = ? AND p.quantity > 0
        `, [acc.account_number]);

        const [active] = await pool.query(`
            SELECT oa.*, o.stock_code, o.order_type, o.write_price, o.quantity, s.stock_name
            FROM order_active oa
            JOIN orders o ON oa.order_id = o.order_id
            JOIN stock_info s ON o.stock_code = s.stock_code
            WHERE o.account_number = ?
        `, [acc.account_number]);

        const [history] = await pool.query(`
            SELECT oh.*, o.stock_code, o.order_type, s.stock_name, oh.completed_at
            FROM order_history oh
            JOIN orders o ON oh.order_id = o.order_id
            JOIN stock_info s ON o.stock_code = s.stock_code
            WHERE o.account_number = ?
            ORDER BY oh.completed_at DESC LIMIT 10
        `, [acc.account_number]);

        res.json({ account: acc, portfolio: pf, activeOrders: active, orderHistory: history });
    } catch(e) { res.status(500).json({error:'Err'}); }
});

// [API] 주문 접수 (수량 반영)
app.post('/api/order', async (req, res) => {
    // [수정] quantity를 body에서 받아옴
    const { userId, stockCode, price, orderType, quantity } = req.body;
    const qty = parseInt(quantity); 
    if (qty <= 0) return res.status(400).json({ error: '수량은 1개 이상이어야 합니다.' });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [accs] = await conn.query('SELECT * FROM accounts WHERE user_id = ?', [userId]);
        const acc = accs[0];
        const totalCost = price * qty;

        if(orderType === 'BUY') {
            if(acc.cash_balance < totalCost) throw new Error('예수금 부족');
            await conn.query('UPDATE accounts SET cash_balance = cash_balance - ? WHERE account_number = ?', [totalCost, acc.account_number]);
        } else {
            const [pf] = await conn.query('SELECT quantity FROM portfolios WHERE account_number = ? AND stock_code = ?', [acc.account_number, stockCode]);
            if(!pf[0] || pf[0].quantity < qty) throw new Error('주식 부족');
            await conn.query('UPDATE portfolios SET quantity = quantity - ? WHERE account_number = ? AND stock_code = ?', [qty, acc.account_number, stockCode]);
        }

        // [수정] orders 테이블에 quantity 컬럼 추가 저장
        const [resOrder] = await conn.query(`
            INSERT INTO orders (account_number, stock_code, order_type, write_price, quantity)
            VALUES (?, ?, ?, ?, ?)
        `, [acc.account_number, stockCode, orderType, price, qty]);
        
        await conn.query(`INSERT INTO order_active (order_id, order_status, filled_quantity) VALUES (?, 'PENDING', 0)`, [resOrder.insertId]);

        await conn.commit();
        res.json({ message: '주문 접수 완료' });
    } catch(e) { await conn.rollback(); res.status(400).json({error: e.message}); }
    finally { conn.release(); }
});

// [API] 주문 취소 (수량 반영 환불)
app.post('/api/cancel', async (req, res) => {
    const { orderId } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        // [수정] 주문 정보 조회 시 quantity도 같이 조회
        const [orders] = await conn.query(`
            SELECT oa.*, o.account_number, o.stock_code, o.order_type, o.write_price, o.quantity
            FROM order_active oa JOIN orders o ON oa.order_id = o.order_id
            WHERE oa.order_id = ?
        `, [orderId]);

        if (orders.length === 0) throw new Error('취소 불가');
        const order = orders[0];
        const refundAmt = order.write_price * order.quantity;

        if (order.order_type === 'BUY') {
            await conn.query('UPDATE accounts SET cash_balance = cash_balance + ? WHERE account_number = ?', [refundAmt, order.account_number]);
        } else {
            await conn.query('UPDATE portfolios SET quantity = quantity + ? WHERE account_number = ? AND stock_code = ?', [order.quantity, order.account_number, order.stock_code]);
        }

        await conn.query('DELETE FROM order_active WHERE order_id = ?', [orderId]);
        await conn.query(`INSERT INTO order_history (order_id, order_status, final_filled_qty) VALUES (?, 'CANCELLED', 0)`, [orderId]);

        await conn.commit();
        res.json({ message: '취소 완료' });
    } catch (e) { await conn.rollback(); res.status(400).json({ error: e.message }); }
    finally { conn.release(); }
});

app.listen(5000, () => console.log('Server running on 5000'));