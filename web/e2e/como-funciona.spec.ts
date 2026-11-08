import { expect, test } from '@playwright/test'

test('«Cómo funciona» se abre desde el pie del inicio, con su título y todas las capturas cargadas', async ({ page }) => {
  const errores: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })
  await page.goto('/')
  await page.locator('.inicio__pie').getByRole('link', { name: 'Cómo funciona' }).click()
  await expect(page).toHaveURL(/\/como-funciona$/)
  await expect(page).toHaveTitle('Cómo planificar tu habitación paso a paso | Decorazon')
  await expect(page.getByRole('heading', { level: 1, name: 'Cómo funciona Decorazon' })).toBeVisible()
  const imagenes = page.locator('.como-funciona__paso img')
  await expect(imagenes).toHaveCount(5)
  for (const img of await imagenes.all()) {
    await img.scrollIntoViewIfNeeded()
    await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true)
  }
  expect(errores).toEqual([])
})
