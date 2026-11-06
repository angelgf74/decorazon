import { expect, test } from '@playwright/test'

test('cinta métrica: dos clics en el suelo acotan la distancia y Escape la quita', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Empezar a diseñar' }).click()
  await page.getByRole('radio', { name: 'Dormitorio' }).check()
  await page.getByRole('button', { name: 'Crear estancia' }).click()

  const medir = page.getByRole('button', { name: 'Medir' })
  await medir.click()
  await expect(medir).toHaveAttribute('aria-pressed', 'true')
  const suelo = (await page.locator('.capa-planta polygon').first().boundingBox())!
  await page.mouse.click(suelo.x + suelo.width * 0.3, suelo.y + suelo.height * 0.5)
  await page.mouse.click(suelo.x + suelo.width * 0.7, suelo.y + suelo.height * 0.5)
  const cota = page.locator('[data-cota-libre] text')
  await expect(cota).toHaveText(/^\d+ cm$/)
  // El 40 % del ancho del suelo de un dormitorio de 400 cm: unos 160 cm.
  const valor = Number((await cota.textContent())!.replace(' cm', ''))
  expect(valor).toBeGreaterThan(150)
  expect(valor).toBeLessThan(170)

  await page.keyboard.press('Escape')
  await expect(page.locator('[data-cota-libre]')).toHaveCount(0)
  await expect(medir).toHaveAttribute('aria-pressed', 'false')
})
