import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    setupFiles: ['src/pruebas/preparar.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Solo para leer editor.css con ?raw en su test; el resto de CSS sigue sin procesarse.
    css: { include: [/editor\.css/] },
  },
})
