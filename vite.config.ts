import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/orbit-weaver/',
  build: {
    chunkSizeWarningLimit: 900,
  },
  plugins: [react()],
})
