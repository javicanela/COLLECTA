import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
  build: {
    chunkSizeWarningLimit: 600,
  },
})
