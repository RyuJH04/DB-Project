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

-- 3. 인덱스 설정 (성능 최적화)
-- 로그인 후 계좌 조회 시 user_id로 accounts를 자주 조회하므로 인덱스 추가
CREATE INDEX idx_accounts_user_id 
  ON accounts(user_id);

-- 대시보드에서 계좌별 보유 종목 조회 시 account_number 조건으로 자주 검색하므로 인덱스 추가
CREATE INDEX idx_portfolios_account_number 
  ON portfolios(account_number);

-- 종목 코드로 보유 종목/포트폴리오를 조회할 수 있으므로 인덱스 추가
CREATE INDEX idx_portfolios_stock_code
  ON portfolios(stock_code);

-- 주문/대시보드에서 계좌별 주문내역 조회 시 account_number 조건을 사용하므로 인덱스 추가
CREATE INDEX idx_orders_account_number 
  ON orders(account_number);

-- 매칭 엔진(matchOrders)에서 stock_code 조건으로 주문을 조회하므로 인덱스 추가
CREATE INDEX idx_orders_stock_code 
  ON orders(stock_code);

-- 향후 특정 주문(order_id) 기준으로 거래내역을 조회할 때를 대비해 인덱스 추가
CREATE INDEX idx_transactions_order_id 
  ON transactions(order_id);

-- 사용자별 로그 조회를 빠르게 하기 위해 인덱스 추가
CREATE INDEX idx_system_logs_user_id
  ON system_logs(user_id);

-- [초기 데이터]
INSERT INTO users (user_name, password, email) VALUES ('워렌버핏', '1234', 'buffet@test.com');
INSERT INTO accounts VALUES ('100-1234-5678', 1, 100000000); 
-- IT 업종 주식 10종
INSERT INTO stock_info VALUES
('005930', '삼성전자', 'KOSPI'),
('000660', 'SK하이닉스', 'KOSPI'),
('035420', 'NAVER', 'KOSPI'),
('035720', '카카오', 'KOSPI'),
('066570', 'LG전자', 'KOSPI'),
('012330', '현대모비스', 'KOSPI'),
('096770', 'SK이노베이션', 'KOSPI'),
('086790', '하나마이크론', 'KOSDAQ'),
('034220', 'LG디스플레이', 'KOSPI'),
('009150', '삼성전기', 'KOSPI');

-- IT 업종 기본 시세 정보
INSERT INTO stock_quote VALUES
('005930', 70000, 100000),
('000660', 120000, 50000),
('035420', 200000, 30000),
('035720', 50000, 40000),
('066570', 90000, 25000),
('012330', 230000, 18000),
('096770', 160000, 20000),
('086790', 27000, 50000),
('034220', 14000, 70000),
('009150', 155000, 15000);