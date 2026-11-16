import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const backendUrl = env.DEV_BACKEND_URL || 'http://localhost:8080'

  return {
    plugins: [react()
    ],
    server: {
      port: 3000,
      // Same-origin API in development, so auth cookies and the Google redirect stay on localhost:3000.
      // xfwd passes the browser's IP through, so Better Auth's rate limiter can tell clients apart.
      proxy: {
        '/api': { target: backendUrl, xfwd: true },
        '/uploads': backendUrl,
      },
    },
  }
})
