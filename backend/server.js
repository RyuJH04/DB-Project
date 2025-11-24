require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// MySQL 커넥션 풀
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// 정상 동작 테스트용
app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong' });
});

// users 조회 테스트용
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users");
    res.json(rows);
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "DB connection failed" });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`✔ Backend running on http://localhost:${port}`);
});
