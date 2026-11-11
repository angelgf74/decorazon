import { expect, test, type Page } from '@playwright/test'

// Modo oscuro (M-29): sigue al sistema. El plano y la 3D se ven igual que de día.
test.use({ colorScheme: 'dark' })

const fondo = (page: Page, selector: string) => page.locator(selector).evaluate((n) => getComputedStyle(n).backgroundColor)
const color = (page: Page, selector: string) => page.locator(selector).evaluate((n) => getComputedStyle(n).color)

/** Luminancia aproximada de un `rgb(r, g, b)` de getComputedStyle. */
function luz(rgb: string): number {
  const [r, g, b] = rgb.match(/\d+/g)!.map(Number)
  return (0.2126 * r! + 0.7152 * g! + 0.0722 * b!) / 255
}

test('con el sistema en oscuro, la interfaz es oscura, el texto claro y el plano sigue claro; sin errores de consola', async ({ page }) => {
  const errores: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })
  await page.goto('/')
  expect(luz(await fondo(page, 'body'))).toBeLessThan(0.2)
  expect(luz(await color(page, 'body'))).toBeGreaterThan(0.8)
  await page.screenshot({ path: 'test-results/oscuro-inicio-1440.png', fullPage: true })

  await page.getByRole('link', { name: 'Empezar a diseñar' }).click()
  await page.getByRole('button', { name: 'Crear estancia' }).click()
  await expect(page.locator('.lienzo__svg')).toBeVisible()
  // El plano: fondo blanco de siempre y muros de tinta oscura.
  expect(await fondo(page, '.lienzo')).toBe('rgb(255, 255, 255)')
  expect(luz(await page.locator('.capa-planta__muros').first().evaluate((n) => getComputedStyle(n).fill))).toBeLessThan(0.3)
  // La barra y el panel, oscuros.
  expect(luz(await fondo(page, '.barra'))).toBeLessThan(0.2)
  await page.getByRole('button', { name: '2 Amueblar' }).click()
  // La franja de la miniatura 3D del catálogo es papel claro, como el plano: el mueble se ve igual de día y de noche.
  const miniatura = page.locator('.panel-catalogo img.panel-catalogo__miniatura').first()
  expect(luz(await miniatura.evaluate((n) => getComputedStyle(n).backgroundColor))).toBeGreaterThan(0.8)
  await expect.poll(() => miniatura.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  await page.screenshot({ path: 'test-results/oscuro-editor-1440.png' })

  // La hoja para imprimir es papel: texto oscuro sobre blanco y muros de tinta oscura, también de noche.
  await page.getByRole('button', { name: 'Más acciones' }).click()
  await page.getByRole('button', { name: 'Imprimir', exact: true }).click()
  const pagina = page.locator('.hoja-impresion__pagina').first()
  await expect(pagina).toBeVisible()
  expect(await pagina.evaluate((n) => getComputedStyle(n).backgroundColor)).toBe('rgb(255, 255, 255)')
  expect(luz(await pagina.evaluate((n) => getComputedStyle(n).color))).toBeLessThan(0.3)
  expect(luz(await page.locator('.hoja-impresion__pagina .capa-planta__muros').first().evaluate((n) => getComputedStyle(n).fill))).toBeLessThan(0.3)
  await page.screenshot({ path: 'test-results/oscuro-hoja-1440.png' })
  await page.keyboard.press('Escape')
  await expect(pagina).toBeHidden()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'test-results/oscuro-editor-390.png' })
  expect(errores).toEqual([])
})
