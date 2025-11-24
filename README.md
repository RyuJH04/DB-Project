# DB-Project 개발 환경 안내

이 문서는 팀원이 GitHub에서 이 프로젝트를 내려받은 후,  
**어떤 구조로 연결되어 있는지**, **무엇을 어떻게 실행해야 하는지**,  
**코드를 수정하려면 어디를 만져야 하는지**를 설명합니다.

---

## 1. 전체 구조 개요

이 프로젝트는 다음과 같이 구성되어 있습니다.

- **프론트엔드**: React + Vite (로컬 PC에서 실행)
- **백엔드**: Node.js + Express (로컬 PC에서 실행)
- **데이터베이스**: MySQL (동국대 리눅스 서버에서 실행)

## 2. 폴더 구조

GitHub에서 내려받으면 대략 다음과 같은 구조입니다.

```bash
DB-Project/
 ├── backend/     # Node.js + Express API 서버
 └── frontend/    # React + Vite 프론트엔드
````

* **코드 수정은 이 두 폴더에서 하시면 됩니다.**
* MySQL 서버 자체는 동국대 리눅스 서버에 이미 설치되어 있으며,

---

## 3. 사전 준비

로컬 PC에 아래가 설치되어 있어야 합니다.

1. **Node.js (LTS 버전)**
2. **Git**
3. **SSH 접속 가능 환경** (Windows의 경우 PowerShell 또는 Git Bash)
4. (선택) VS Code 등 에디터

---

## 4. GitHub에서 프로젝트 가져오기

원하는 위치에서 다음 명령을 실행합니다.

```bash
git clone <이 레포지토리의 URL>
cd DB-Project
```

이후 작업은 `DB-Project` 폴더 안에서 이루어집니다.

---

## 5. MySQL 서버 연결 방식 이해하기 (중요)

### 5.1. MySQL은 어디에 있는가? 류재훈 sql 포트로 사용

* MySQL 서버는 **동국대 리눅스 서버**에 설치되어 있습니다.
* 포트: `2006`
* 데이터베이스 이름: `webdb`
* 테이블 예시: `users` 등

팀원은 **직접 MySQL을 설치할 필요가 없고**,
대신 **SSH 포트포워딩**을 통해 로컬에서 이 MySQL에 접근합니다.

### 5.2. SSH 포트포워딩 실행 방법

로컬 PC에서 (PowerShell 또는 터미널에서) 아래 명령을 실행합니다.

```bash
ssh -L 2006:localhost:2006 2023112375@cs.dongguk.edu -p 102
```

* 이 창은 **계속 켜두어야** 합니다.
* 닫히면 MySQL 연결이 끊어져서 백엔드가 DB에 접속할 수 없습니다.
* 이 명령을 실행하면,
  PC의 `localhost:2006` 이 리눅스 서버의 MySQL(`localhost:2006`)과 연결됩니다.

### 5.3. MySQL에 직접 접속하고 싶을 때 (선택)

DB 스키마를 보고 싶거나 직접 쿼리를 날리고 싶다면,
위 포트포워딩을 켠 상태에서 **다른 터미널**을 열고 다음을 실행합니다.

```bash
mysql -h 127.0.0.1 -P 2006 -u root -p
```

혹은 서버에서 직접 접속하려면:

```bash
ssh 2023112375@cs.dongguk.edu -p 102
~/mysql/bin/mysql --socket=/home/2023112375/socket --port=2006 -u root -p
```

DB 접속 후 사용할 데이터베이스:

```sql
USE webdb;
```

---

## 6. 백엔드 사용 방법 (Node.js + Express)

### 6.1. 의존성 설치

```bash
cd backend
npm install
```

### 6.2. 환경 변수 설정 (`.env`)

`backend` 폴더 안에 `.env` 파일을 생성하고, 아래 내용을 넣습니다.
(비밀번호는 팀 내에서 공유)

```env
DB_HOST=localhost
DB_PORT=2006
DB_USER=root
DB_PASS=rjh040328!
DB_NAME=webdb

PORT=5000
```

* `DB_HOST=localhost` 인 이유:
  SSH 포트포워딩을 통해 서버 MySQL을 로컬의 `localhost:2006`으로 연결했기 때문입니다.
* 비밀번호를 모르면 팀장/설치 담당자에게 문의하면 됩니다.

### 6.3. 백엔드 서버 실행

```bash
cd backend
node server.js
```

정상 실행 시 콘솔에 예를 들어 다음과 비슷한 메시지가 뜹니다.

```text
API server running on http://localhost:5000
```

테스트는 다음과 같이 할 수 있습니다.

```bash
curl http://localhost:5000/api/ping
curl http://localhost:5000/api/users
```

* `/api/users` 에서 `users` 테이블의 데이터(JSON)가 보이면 **백엔드 ↔ MySQL 연결 성공**입니다.

---

## 7. 프론트엔드 사용 방법 (React + Vite)

### 7.1. 의존성 설치

```bash
cd frontend
npm install
```

### 7.2. Vite 설정 (이미 되어 있는 경우 수정 불필요, 참고용)

`frontend/vite.config.js` 파일에는 아래와 같이 설정되어 있습니다.

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
})
```

* 이 설정 덕분에 프론트에서 `fetch('/api/xxx')` 로 요청하면
  자동으로 백엔드 `http://localhost:5000/api/xxx` 로 전달됩니다.

### 7.3. 프론트엔드 서버 실행

```bash
cd frontend
npm run dev
```

실행 후 브라우저에서:

```
http://localhost:5173
```

로 접속합니다.

* 화면에 `users` 데이터가 보이면
  **React → 백엔드 → MySQL 전체 경로가 정상 동작** 중입니다.

---

## 8. 코드 수정 시 어디를 고치면 되는가?

### 8.1. MySQL 관련 쿼리 / 데이터 처리 수정

* 위치: `backend/server.js` (또는 `backend` 안의 다른 라우터 파일)
* 예:

  * `/api/users` 라우트에서 `SELECT * FROM users` → 필요에 맞게 수정
  * 새로운 API를 추가하고 싶으면 `app.get`, `app.post` 등을 추가

### 8.2. 화면(UI) 수정

* 위치: `frontend/src` 아래

  * `App.jsx` 또는 라우터 기반 구조라면 각 페이지 컴포넌트
* 예:

  * `useEffect` 안에서 `/api/…` 호출 부분 수정
  * 받은 데이터를 어떻게 렌더링할지 JSX 수정

### 8.3. 일반적인 작업 순서

1. SSH 포트포워딩 켜기 (`ssh -L 2006:localhost:2006 ...`)
2. `backend`에서 `node server.js` 실행
3. `frontend`에서 `npm run dev` 실행
4. VS Code로 코드 수정
5. 브라우저에서 새로고침 또는 Vite의 HMR로 변경 사항 확인

---

## 9. 자주 발생할 수 있는 문제와 해결

### 9.1. 백엔드에서 DB 연결 오류가 나는 경우

* SSH 포트포워딩 창이 꺼져 있지 않은지 확인
* `.env`의 `DB_PASS`, `DB_NAME`이 올바른지 확인
* MySQL에서 해당 DB/테이블이 존재하는지 확인 (`USE webdb; SHOW TABLES;`)

### 9.2. 프론트에서 `/api/...` 호출이 실패하는 경우

* 백엔드(`node server.js`)가 실행 중인지 확인
* Vite dev 서버(`npm run dev`)가 실행 중인지 확인
* CORS 문제는 `server.js`에서 `cors()` 미들웨어로 처리되어 있으므로 기본 설정 상태에서는 문제 없음

---

## 10. 요약 – 팀원이 따라야 할 최소 절차

1. GitHub에서 레포지토리 `git clone`
2. 터미널 1: SSH 포트포워딩 실행

   ```bash
   ssh -L 2006:localhost:2006 2023112375@cs.dongguk.edu -p 102
   ```
3. 터미널 2: `backend` 진입 → `npm install` → `.env` 생성 → `node server.js`
4. 터미널 3: `frontend` 진입 → `npm install` → `npm run dev`
5. 브라우저에서 `http://localhost:5173` 접속

이 과정을 따르면, 팀원 누구든지 **동일한 환경에서 바로 실행 및 수정**이 가능합니다.

```

---

이렇게 작성해 두시면, 팀원이 GitHub에서 프로젝트를 내려받았을 때:

- “이게 어떤 구조인지”  
- “먼저 뭘 켜야 하는지 (포트포워딩 → 백엔드 → 프론트)”  
- “SQL에 접속하려면 어떤 명령을 써야 하는지”  
- “수정을 하려면 어느 파일을 손대야 하는지”

를 한 번에 이해할 수 있을 것입니다.

혹시 실제로 사용 중인 `server.js`에 맞춰서 README의 API 설명 부분을 더 구체적으로 맞추고 싶으시면, `server.js` 코드를 보내주시면 그에 딱 맞게 README도 미세 조정해 드리겠습니다.
::contentReference[oaicite:0]{index=0}
```
