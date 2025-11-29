/* database/schema.sql */

-- 1. DB 문자셋 설정 (한글 깨짐 방지)
ALTER DATABASE webdb CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

SET foreign_key_checks = 0;
DROP TABLE IF EXISTS system_logs, transactions, order_history, order_active, orders, portfolios, stock_quote, stock_info, accounts, users;
SET foreign_key_checks = 1;

-- 2. 테이블 생성
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  user_name VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE accounts (
  account_number VARCHAR(20) PRIMARY KEY,
  user_id INT NOT NULL,
  cash_balance DECIMAL(15, 2) DEFAULT 0.00,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stock_info (
  stock_code VARCHAR(10) PRIMARY KEY,
  stock_name VARCHAR(50) NOT NULL,
  market_type VARCHAR(10) NOT NULL
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stock_quote (
  stock_code VARCHAR(10) PRIMARY KEY,
  current_price DECIMAL(15, 2) NOT NULL,
  volume INT DEFAULT 0,
  FOREIGN KEY (stock_code) REFERENCES stock_info(stock_code)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE portfolios (
  portfolio_id INT AUTO_INCREMENT PRIMARY KEY,
  account_number VARCHAR(20) NOT NULL,
  stock_code VARCHAR(10) NOT NULL,
  quantity INT DEFAULT 0,
  average_buy_price DECIMAL(15, 2) DEFAULT 0.00,
  FOREIGN KEY (account_number) REFERENCES accounts(account_number),
  FOREIGN KEY (stock_code) REFERENCES stock_info(stock_code),
  UNIQUE KEY uk_pf (account_number, stock_code)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [수정됨] quantity 컬럼 추가 (ALTER TABLE 내용 반영)
CREATE TABLE orders (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  account_number VARCHAR(20) NOT NULL,
  stock_code VARCHAR(10) NOT NULL,
  quantity INT NOT NULL DEFAULT 1, -- 여기가 추가되었습니다!
  order_type VARCHAR(10) NOT NULL,
  write_price DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_number) REFERENCES accounts(account_number),
  FOREIGN KEY (stock_code) REFERENCES stock_info(stock_code)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_active (
  order_id INT PRIMARY KEY,
  order_status VARCHAR(20) DEFAULT 'PENDING',
  filled_quantity INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_history (
  order_id INT PRIMARY KEY,
  order_status VARCHAR(20) NOT NULL,
  final_filled_qty INT NOT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(order_id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE transactions (
  transaction_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  qty INT NOT NULL,
  trans_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(order_id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE system_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action_type VARCHAR(50),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [초기 데이터]
INSERT INTO users (user_name, password, email) VALUES ('워렌버핏', '1234', 'buffet@test.com');
INSERT INTO accounts VALUES ('100-1234-5678', 1, 100000000); 
INSERT INTO stock_info VALUES ('005930', '삼성전자', 'KOSPI'), ('000660', 'SK하이닉스', 'KOSPI'), ('035420', 'NAVER', 'KOSPI');
INSERT INTO stock_quote VALUES ('005930', 70000, 100000), ('000660', 120000, 50000), ('035420', 200000, 30000);