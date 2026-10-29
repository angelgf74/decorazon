import { expect, test } from '@playwright/test'

test('vista 3D: canvas con contenido, sin errores y paredes alternables', async ({ page }) => {
  const errores: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })
  page.on('pageerror', (e) => errores.push(e.message))

  await page.goto('/')
  await page.getByRole('link', { name: 'Empezar a diseñar' }).click()
  await page.getByRole('radio', { name: 'Dormitorio' }).check()
  await page.getByRole('button', { name: 'Crear estancia' }).click()
  await page.getByRole('button', { name: '2 Amueblar' }).click()
  await page.getByRole('button', { name: /^Armario/ }).click()
  await page.getByRole('button', { name: /^Cama/ }).click()
  await expect(page.locator('[data-elemento]')).toHaveCount(2)

  await page.getByRole('button', { name: '3D', exact: true }).click()
  const lienzo = page.locator('canvas')
  await expect(lienzo).toBeVisible()
  await page.getByRole('button', { name: 'Encuadrar' }).click()

  // Muestra de 400 píxeles de la zona central. Los materiales son planos y salen unos 40 tonos (un lienzo vacío da 1).
  // Se repinta a demanda, así que se espera.
  await expect.poll(async () => {
    const png = await lienzo.screenshot()
    return page.evaluate(async (b64) => {
      const img = new Image()
      img.src = `data:image/png;base64,${b64}`
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const colores = new Set<number>()
      for (let i = 0; i < 400; i++) {
        const x = Math.floor(img.width * (0.2 + 0.6 * ((i % 20) + 0.5) / 20))
        const y = Math.floor(img.height * (0.2 + 0.7 * (Math.floor(i / 20) + 0.5) / 20))
        const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
        colores.add((r << 16) | (g << 8) | b)
      }
      return colores.size
    }, png.toString('base64'))
  }, { timeout: 15000 }).toBeGreaterThanOrEqual(30)

  const paredes = page.getByRole('button', { name: 'Ocultar paredes delante' })
  const antes = await paredes.getAttribute('aria-pressed')
  await paredes.click()
  await expect(paredes).not.toHaveAttribute('aria-pressed', antes!)
  await paredes.click()
  await expect(paredes).toHaveAttribute('aria-pressed', antes!)

  await page.getByRole('button', { name: '2D', exact: true }).click()
  await expect(page.locator('[data-elemento]')).toHaveCount(2)
  expect(errores).toEqual([])
})
