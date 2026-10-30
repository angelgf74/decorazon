import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // El fragmento de la vista 3D (three y drei, ~1 MB) se carga bajo demanda al pulsar 3D; el index sigue muy por debajo.
  build: { chunkSizeWarningLimit: 1100 },
  test: {
    environment: 'node',
    setupFiles: ['src/pruebas/preparar.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Solo para leer editor.css con ?raw en su test; el resto de CSS sigue sin procesarse.
    css: { include: [/editor\.css/] },
    // Para node, fiber y test-renderer solo declaran "main" (CJS), que carga otro three con require(); su ESM usa el mismo three que la app.
    // drei, igual: su ESM, procesado por Vite, importa ese mismo fiber; su CJS traería otro, con otro contexto de Canvas.
    alias: [
      { find: /^@react-three\/(fiber|test-renderer)$/, replacement: '@react-three/$1/dist/react-three-$1.esm.js' },
      { find: /^@react-three\/drei$/, replacement: '@react-three/drei/index.js' },
    ],
    server: { deps: { inline: ['@react-three/drei'] } },
  },
})
