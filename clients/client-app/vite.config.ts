import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'nema-sandbox-production-alb-1121483722.us-west-2.elb.amazonaws.com'
    ]
  },
  define: {
    global: 'globalThis',
  }
})