# DB-Project 개발 환경 안내

이 문서는 팀원이 GitHub에서 이 프로젝트를 내려받은 후,  
**어떤 구조로 연결되어 있는지**, **무엇을 어떻게 실행해야 하는지**,  
**코드를 수정하려면 어디를 만져야 하는지**를 설명합니다.

-----

## 1\. 전체 구조 개요

이 프로젝트는 다음과 같이 구성되어 있습니다.

  - **프론트엔드**: React + Vite (로컬 PC에서 실행)
  - **백엔드**: Node.js + Express (로컬 PC에서 실행)
  - **데이터베이스 (RDBMS)**: MySQL (동국대 리눅스 서버 - SSH 터널링으로 접속)
  - **데이터베이스 (Cache)**: **Redis** (로컬 PC에 직접 설치 및 실행)

## 2\. 폴더 구조

GitHub에서 내려받으면 대략 다음과 같은 구조입니다.

```bash
DB-Project/
 ├── backend/            # Node.js + Express API 서버
 ├── frontend/           # React + Vite 프론트엔드
 └── database/           # DB 스키마 SQL 파일 (schema.sql)
```

  * **코드 수정은 `backend`와 `frontend` 폴더에서 하시면 됩니다.**
  * MySQL 서버 자체는 동국대 리눅스 서버에 이미 설치되어 있습니다.

-----

## 3\. 사전 준비 (필수)

로컬 PC에 아래 프로그램들이 설치되어 있어야 합니다.

1.  **Node.js (LTS 버전)**
2.  **Git**
3.  **SSH 접속 가능 환경** (Windows의 경우 PowerShell 또는 Git Bash)
4.  **Redis (필수)**
      * **Windows 사용자:** wsl 에서 redis 설치 후 실행
      * **Mac 사용자:** `brew install redis`
5.  (선택) VS Code 등 에디터

-----

## 4\. GitHub에서 프로젝트 가져오기

원하는 위치에서 다음 명령을 실행합니다.

```bash
git clone <이 레포지토리의 URL>
cd DB-Project
```

이후 작업은 `DB-Project` 폴더 안에서 이루어집니다.

-----

## 5\. MySQL 서버 연결 및 DB 초기화 (중요)

### 5.1. MySQL은 어디에 있는가?

  * MySQL 서버는 **동국대 리눅스 서버**에 설치되어 있습니다.
  * 포트: `2006`
  * 데이터베이스 이름: `webdb`

팀원은 **직접 MySQL을 설치할 필요가 없고**, **SSH 포트포워딩**을 통해 로컬에서 접근합니다.

### 5.2. SSH 포트포워딩 실행 방법 (터미널 1)

로컬 PC에서 (PowerShell 또는 터미널에서) 아래 명령을 실행합니다.

```bash
ssh -L 2006:localhost:2006 2023112375@cs.dongguk.edu -p 102
```

  * 이 창은 **계속 켜두어야** 합니다. (닫으면 DB 연결 끊김)
  * 이 명령을 실행하면 PC의 `localhost:2006`이 리눅스 서버의 MySQL과 연결됩니다.

### 5.3. [cite\_start]DB 스키마 초기화 (업데이트 시 필수\!) [cite: 5]

**⚠️ 프로젝트 업데이트로 DB 구조가 변경되었습니다.** (지정가 주문, 3단 분리 구조 등)
SSH 포트포워딩이 켜진 상태에서, **새 터미널**을 열고 아래 명령어로 DB를 최신 상태로 만들어주세요.

```bash
mysql --default-character-set=utf8mb4 -h 127.0.0.1 -P 2006 -u root -p webdb < database/schema.sql
```


  * 비밀번호: 
  * **주의:** 기존 데이터는 초기화됩니다.

-----

## 6\. 백엔드 사용 방법 (Node.js + Express)

### 6.1. Redis 실행 확인
백엔드를 켜기 전에 **반드시 로컬 컴퓨터에 Redis가 켜져 있어야 합니다.**

  * Windows: 작업 관리자 -\> 서비스 -\> `Redis`가 '실행 중'인지 확인.

### 6.2. 의존성 설치

```bash
cd backend
npm install
```

### 6.3. 환경 변수 설정 (`.env`)

`backend` 폴더 안에 `.env` 파일을 생성하고, 아래 내용을 넣습니다.

```env
DB_HOST=localhost
DB_PORT=2006
DB_USER=root
DB_PASS=rjh040328!
DB_NAME=webdb

PORT=5000
```

### 6.4. 백엔드 서버 실행 (터미널 2)

```bash
cd backend
node server.js
```

정상 실행 시 콘솔에 다음과 같은 메시지가 뜹니다.

```text
Server running on 5000
✅ Connected to Local Redis
```

  * `Connected to Local Redis`가 안 뜨면 Redis가 설치되지 않았거나 꺼져있는 것입니다.

-----

## 7\. 프론트엔드 사용 방법 (React + Vite)

### 7.1. 의존성 설치

```bash
cd frontend
npm install
```

### 7.2. 프론트엔드 서버 실행 (터미널 3)

```bash
cd frontend
npm run dev
```

실행 후 브라우저에서 `http://localhost:5173` 으로 접속합니다.

  * **로그인 정보(테스트):** `buffet@test.com` / `1234`

-----

## 8\. 주요 변경 사항 (개발 가이드)

### 8.1. 지정가 주문 시스템 (Limit Order)

  * 이제 주식 주문 시 **희망 가격**과 **수량**을 입력합니다.
  * 주문 즉시 체결되지 않고, 시세가 희망 가격에 도달할 때 체결됩니다.
  * **미체결 주문**은 대시보드 하단 `Active Orders` 탭에서 확인 및 **취소**할 수 있습니다.

### 8.2. 데이터베이스 구조 변경

  * `orders`: 주문 원장 (모든 주문 기록)
  * `order_active`: 미체결 및 진행 중인 주문 (Hot Data)
  * `order_history`: 체결 완료 또는 취소된 주문 (Cold Data)

-----

## 9\. 자주 발생할 수 있는 문제와 해결

### 9.1. `Error: connect ECONNREFUSED 127.0.0.1:6379`

  * **원인:** 로컬 PC에 Redis가 켜져 있지 않음.
  * **해결:** Redis 설치 여부 확인 및 실행.

### 9.2. `Error: connect ECONNREFUSED 127.0.0.1:2006`

  * **원인:** SSH 포트포워딩 터미널이 꺼짐.
  * **해결:** `ssh -L 2006...` 명령어를 다시 실행.

### 9.3. DB 에러 (컬럼 없음, 테이블 없음 등)

  * **원인:** 로컬 코드는 최신인데 DB 스키마가 옛날 버전임.
  * **해결:** **5.3절의 DB 스키마 초기화 명령어**를 다시 실행하세요.

-----

## 10\. 요약 – 팀원이 따라야 할 최소 절차

1.  **Redis 설치 및 실행** (내 컴퓨터에)
2.  **SSH 포트포워딩 실행** (터미널 1)
3.  **DB 스키마 초기화** (한 번만 실행, 업데이트 시 재실행)
    ```bash
    mysql --default-character-set=utf8mb4 -h 127.0.0.1 -P 2006 -u root -p webdb < database/schema.sql
    ```
4.  **백엔드 실행** (터미널 2): `npm install` → `node server.js`
5.  **프론트엔드 실행** (터미널 3): `npm install` → `npm run dev`
6.  브라우저 접속: `http://localhost:5173`
