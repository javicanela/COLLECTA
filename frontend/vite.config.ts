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
    rolldownOptions: {
      output: {
        codeSplitting: {
          maxSize: 550000,
          groups: [
            {
              name: 'vendor-react',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom|zustand)[\\/]/,
              priority: 50,
            },
            {
              name: 'vendor-motion',
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              priority: 40,
            },
            {
              name: 'feature-smart-import',
              test: /[\\/]src[\\/]features[\\/]smart-import[\\/]/,
              priority: 30,
            },
            {
              name: 'vendor-smart-import',
              test: /[\\/]node_modules[\\/](xlsx|papaparse|react-dropzone|mammoth|fast-xml-parser|pdfjs-dist|tesseract\.js)[\\/]/,
              priority: 30,
            },
            {
              name: 'vendor-pdf',
              test: /[\\/]node_modules[\\/]@react-pdf[\\/]/,
              priority: 30,
            },
          ],
        },
      },
    },
  },
})
