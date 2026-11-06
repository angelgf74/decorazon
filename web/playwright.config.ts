import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  // El recorrido de cuentas necesita la API y PostgreSQL: npm run e2e:cuentas.
  testIgnore: 'cuentas/**',
  forbidOnly: !!process.env.CI,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // La guía del primer uso ya está vista: solo ejemplos.spec.ts la prueba, sin este estado.
  use: { baseURL: 'http://localhost:5322', storageState: 'e2e/estado-sin-guia.json' },
  webServer: {
    command: 'npm run build && npx vite preview --port 5322 --strictPort',
    url: 'http://localhost:5322',
    reuseExistingServer: !process.env.CI,
    // El build es de producción y leería VITE_ANALITICA_SITIO de .env.production: sin sitio, la analítica no se carga.
    // Así los e2e no cuentan visitas de mentira ni fallan por el CORS del tracker contra localhost.
    env: { VITE_ANALITICA_SITIO: '' },
  },
})
