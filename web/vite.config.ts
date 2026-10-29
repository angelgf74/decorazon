import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    setupFiles: ['src/pruebas/preparar.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
