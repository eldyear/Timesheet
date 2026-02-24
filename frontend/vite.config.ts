import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Этот прокси будет работать ТОЛЬКО когда ты пишешь npm run dev
      }
    }
  },
  // Добавляем, чтобы Vite понимал переменные окружения Vercel
  define: {
    'process.env': {}
  }
})
