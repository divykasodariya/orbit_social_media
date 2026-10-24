import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Optional: proxy API calls in development
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})