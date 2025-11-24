import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [users, setUsers] = useState([])

  useEffect(() => {
    // 백엔드 → /api/users 호출 (vite proxy 통해 자동으로 5000번 포트로 넘어감)
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        console.log("API data:", data)
        setUsers(data)
      })
      .catch((err) => {
        console.error("API error:", err)
      })
  }, [])

  return (
    <div style={{ padding: "24px" }}>
      <h1>사용자 목록</h1>

      {users.length === 0 ? (
        <p>불러오는 중...</p>
      ) : (
        <ul>
          {users.map(user => (
            <li key={user.id}>
              {user.id}. {user.name} ({user.email})
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default App
