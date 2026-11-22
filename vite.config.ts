import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { aiDevApi } from './dev/ai-dev-api'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), aiDevApi()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 5173 },
  // PGlite ships its own WebAssembly files; Vite must not pre-bundle it.
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
})
