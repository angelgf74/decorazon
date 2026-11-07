import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Decorazon',
        short_name: 'Decorazon',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        theme_color: '#B9473A',
        background_color: '#FFF8F0',
        icons: [
          { src: '/iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/iconos/icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/iconos/icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Se precarga todo el shell, también el fragmento 3D (~1 MB). La API está en otro origen y no se cachea:
      // los datos sin conexión salen de las copias locales.
      workbox: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
      },
    }),
  ],
  // El fragmento de la vista 3D (three y drei, ~1 MB) se carga bajo demanda al pulsar 3D; el index sigue muy por debajo.
  build: { chunkSizeWarningLimit: 1100 },
  test: {
    environment: 'node',
    setupFiles: ['src/pruebas/preparar.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'pruebas-build/**/*.test.ts'],
    // Solo para leer editor.css, base.css, lienzo.css y vista3d.css con ?raw en sus tests; el resto de CSS sigue sin procesarse.
    css: { include: [/editor\.css/, /base\.css/, /lienzo\.css/, /vista3d\.css/] },
    // Para node, fiber y test-renderer solo declaran "main" (CJS), que carga otro three con require(); su ESM usa el mismo three que la app.
    // drei, igual: su ESM, procesado por Vite, importa ese mismo fiber; su CJS traería otro, con otro contexto de Canvas.
    alias: [
      { find: /^@react-three\/(fiber|test-renderer)$/, replacement: '@react-three/$1/dist/react-three-$1.esm.js' },
      { find: /^@react-three\/drei$/, replacement: '@react-three/drei/index.js' },
    ],
    server: { deps: { inline: ['@react-three/drei'] } },
  },
})
