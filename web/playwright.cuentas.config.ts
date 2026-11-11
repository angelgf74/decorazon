import { randomBytes } from 'node:crypto'
import { rmSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'
import { CARPETA_DE_CORREOS } from './e2e/cuentas/correo'

// Recorrido de cuentas con la API real y PostgreSQL (docker compose up -d, o el servicio del CI).
// Base de datos propia, que la API crea y migra al arrancar en Development.
const BASE_DE_DATOS = 'Host=localhost;Port=5435;Database=decorazon_e2e;Username=decorazon;Password=decorazon_local'

// Los workers también cargan esta configuración: solo el proceso principal vacía la carpeta.
if (process.env.TEST_WORKER_INDEX === undefined) rmSync(CARPETA_DE_CORREOS, { recursive: true, force: true })

export default defineConfig({
  testDir: 'e2e/cuentas',
  forbidOnly: !!process.env.CI,
  // Las pruebas siguen a una misma cuenta: registro, guardado, contraseña y baja.
  workers: 1,
  timeout: 60_000,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // En el CI, el informe HTML y las trazas de lo que falle se suben como artefactos.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:5322', trace: 'retain-on-failure', storageState: 'e2e/estado-sin-guia.json' },
  webServer: [
    {
      command: 'dotnet run --project ../src/Decorazon.Api --no-launch-profile --urls http://localhost:5320',
      url: 'http://localhost:5320/salud',
      // Nunca la API de desarrollo: esta usa otra base, otra clave y la carpeta de correos.
      reuseExistingServer: false,
      timeout: 240_000,
      // El log de la API sale con el de la prueba: sin él, un fallo del servidor no se ve.
      stdout: 'pipe',
      env: {
        ASPNETCORE_ENVIRONMENT: 'Development',
        ConnectionStrings__Decorazon: BASE_DE_DATOS,
        // Aleatoria en cada ejecución: no firma nada fuera de esta prueba.
        Jwt__ClaveDeFirma: randomBytes(48).toString('base64'),
        Correo__UsarBrevo: 'false',
        Correo__CarpetaDeSimulados: CARPETA_DE_CORREOS,
        Correo__BaseDeLaWeb: 'http://localhost:5322',
        Cors__Origenes__0: 'http://localhost:5322',
      },
    },
    {
      command: 'npm run build && npx vite preview --port 5322 --strictPort',
      url: 'http://localhost:5322',
      reuseExistingServer: false,
      timeout: 180_000,
      // Build de producción: sin vaciar VITE_ANALITICA_SITIO leería el de .env.production y contaría visitas reales.
      env: { VITE_API_URL: 'http://localhost:5320', VITE_ANALITICA_SITIO: '' },
    },
  ],
})
