import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  use: { baseURL: 'http://localhost:5322' },
  webServer: {
    command: 'npm run build && npx vite preview --port 5322 --strictPort',
    url: 'http://localhost:5322',
    reuseExistingServer: !process.env.CI,
  },
})
