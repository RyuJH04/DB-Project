/* frontend/src/App.jsx */
import { useState, useEffect } from 'react';
import './App.css'; // 아래 CSS 꼭 적용하세요

function App() {
  const [user, setUser] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [dashboard, setDashboard] = useState({ account: {}, portfolio: [], activeOrders: [], orderHistory: [] });
  const [selectedStock, setSelectedStock] = useState(null);
  const [price, setPrice] = useState(0);
  const [tab, setTab] = useState('ACTIVE'); // ACTIVE or HISTORY
  const [qty, setQty] = useState(1);
  // 로그인 폼 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if(user) {
      const interval = setInterval(() => {
        fetchStocks();
        fetchDashboard();
      }, 2000); // 2초마다 갱신
      return () => clearInterval(interval);
    }
  }, [user]);

  const login = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({email, password})
    });
    const data = await res.json();
    if(res.ok) setUser(data.user);
    else alert(data.error);
  };

  const fetchStocks = async () => {
    const res = await fetch('/api/stocks');
    setStocks(await res.json());
  };

  const fetchDashboard = async () => {
    if(!user) return;
    const res = await fetch(`/api/dashboard/${user.user_id}`);
    setDashboard(await res.json());
  };

  const placeOrder = async (type) => {
  if(!selectedStock) return alert('종목 선택');
  if(!confirm(`${selectedStock.stock_name} ${qty}주를 ${price}원에 ${type === 'BUY'?'매수':'매도'}?`)) return;

  const res = await fetch('/api/order', {
    method:'POST', headers:{'Content-Type':'application/json'},
    // [수정] quantity: qty 추가
    body: JSON.stringify({ userId: user.user_id, stockCode: selectedStock.stock_code, price: parseInt(price), orderType: type, quantity: parseInt(qty) })
  });
  const data = await res.json();
  alert(data.message || data.error);
  fetchDashboard();
};

  const cancelOrder = async (orderId) => {
    if(!confirm('정말 이 주문을 취소하시겠습니까?')) return;

    try {
      const res = await fetch('/api/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      
      if (res.ok) {
        alert('주문이 취소되었습니다. (자산 환불 완료)');
        fetchDashboard(); // 잔고와 목록 갱신
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('취소 요청 중 오류가 발생했습니다.');
    }
  };

  if (!user) return (
    <div className="login-container">
      <form onSubmit={login} className="login-box">
        <h2> Dongguk Trading</h2>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button>Login</button>
        <p>Tip: buffet@test.com / 1234</p>
      </form>
    </div>
  );

  return (
    <div className="app-container">
      <header>
        <div className="logo">📈 DonggukTrader</div>
        <div className="user-info">
          <span>{user.user_name}님</span>
          <span className="balance">₩ {Number(dashboard.account?.cash_balance || 0).toLocaleString()}</span>
        </div>
      </header>

      <div className="main-grid">
        {/* 1. 시세 목록 */}
        <div className="panel market-list">
          <h3>Market Price</h3>
          <ul>
            {stocks.map(s => (
              <li key={s.stock_code} onClick={() => { setSelectedStock(s); setPrice(s.current_price); }}
                  className={selectedStock?.stock_code === s.stock_code ? 'active' : ''}>
                <div className="row">
                  <span className="name">{s.stock_name}</span>
                  <span className="code">{s.stock_code}</span>
                </div>
                <div className="price">{s.current_price.toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </div>

        {/* 2. 주문 입력 */}
        <div className="panel order-panel">
          <h3>Order Entry</h3>
          {selectedStock ? (
            <div className="order-form">
              <div className="stock-title">{selectedStock.stock_name}</div>
              <div className="current-price-display">{selectedStock.current_price.toLocaleString()} KRW</div>
              
              <div className="input-group">
                <label>Price</label>
                <input type="number" value={price} onChange={e=>setPrice(e.target.value)} />
              </div>
              <div className="input-group">
  <label>Qty</label>
  <input 
    type="number" 
    min="1"
    value={qty} 
    onChange={e => setQty(e.target.value)} 
  />
</div>

              <div className="btn-group">
                <button className="buy-btn" onClick={()=>placeOrder('BUY')}>BUY</button>
                <button className="sell-btn" onClick={()=>placeOrder('SELL')}>SELL</button>
              </div>
            </div>
          ) : <div className="empty-msg">Select a stock</div>}
        </div>

        {/* 3. 포트폴리오 */}
        <div className="panel portfolio-panel">
          <h3>Holdings</h3>
          <table>
            <thead><tr><th>Stock</th><th>Qty</th><th>Avg Price</th></tr></thead>
            <tbody>
              {dashboard.portfolio.map((p,i) => (
                <tr key={i}>
                  <td>{p.stock_name}</td>
                  <td>{p.quantity}</td>
                  <td>{Number(p.average_buy_price).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4. 주문 내역 (하단) */}
        <div className="panel history-panel">
          <div className="tabs">
            <button className={tab==='ACTIVE'?'active':''} onClick={()=>setTab('ACTIVE')}>Active Orders</button>
            <button className={tab==='HISTORY'?'active':''} onClick={()=>setTab('HISTORY')}>Order History</button>
          </div>
<div className="table-wrapper">
  <table>
    <thead>
      <tr>
        <th>Time</th><th>Stock</th><th>Type</th><th>Price</th><th>Status</th><th>Action</th> {/* Action 헤더 추가 */}
      </tr>
    </thead>
    <tbody>
      {tab === 'ACTIVE' ? dashboard.activeOrders.map((o,i) => (
        <tr key={i}>
          <td>{new Date().toLocaleTimeString()}</td> {/* Active는 시간 컬럼이 없어서 현재시간 임시 표시 */}
          <td>{o.stock_name}</td>
          <td className={o.order_type}>{o.order_type}</td>
          <td>{Number(o.write_price).toLocaleString()}</td>
          <td><span className="badge pending">{o.order_status}</span></td>
          <td>
            {/* 취소 버튼 추가 */}
            <button 
              onClick={() => cancelOrder(o.order_id)}
              style={{ padding: '4px 8px', fontSize: '11px', cursor: 'pointer', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Cancel
            </button>
          </td>
        </tr>
      )) : dashboard.orderHistory.map((o,i) => (
        <tr key={i}>
          <td>{new Date(o.completed_at).toLocaleTimeString()}</td>
          <td>{o.stock_name}</td>
          <td className={o.order_type}>{o.order_type}</td>
          <td>Fil: {o.final_filled_qty}</td>
          <td><span className={`badge ${o.order_status === 'CANCELLED' ? 'cancelled' : 'filled'}`}>{o.order_status}</span></td>
          <td>-</td> {/* 히스토리에는 버튼 없음 */}
        </tr>
      ))}
    </tbody>
  </table>
</div>
        </div>
      </div>
    </div>
  );
}

export default App;