import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // React → Vite 개발 서버 → 백엔드 서버(5000번)로 요청을 넘김
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
})
