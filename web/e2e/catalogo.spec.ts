import { expect, test, type Page } from '@playwright/test'

/** Los tipos de los elementos tal como están guardados en localStorage. */
const tiposGuardados = (page: Page) => page.evaluate(() => {
  const crudo = localStorage.getItem('decorazon.disenoAnonimo')
  if (crudo === null) return []
  const { documento } = JSON.parse(crudo) as { documento: { elementos: { tipo: string }[] } }
  return documento.elementos.map((e) => e.tipo)
})

async function amueblarDormitorio(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'Empezar a diseñar' }).click()
  await page.getByRole('radio', { name: 'Dormitorio' }).check()
  await page.getByRole('button', { name: 'Crear estancia' }).click()
  await page.getByRole('button', { name: '2 Amueblar' }).click()
}

// Plan 30: cada tarjeta enseña el mueble en 3D (public/miniaturas/<id>.webp), no su huella.
test('las miniaturas 3D del catálogo cargan', async ({ page }) => {
  await amueblarDormitorio(page)
  const imagenes = page.locator('.panel-catalogo img.panel-catalogo__miniatura')
  await expect(imagenes.first()).toBeVisible()
  for (let i = 0; i < 4; i++) {
    await expect.poll(() => imagenes.nth(i).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  }
  // Ninguna ha caído a la huella de reserva: todas las de la vista han cargado.
  await expect(page.locator('.panel-catalogo svg.panel-catalogo__miniatura')).toHaveCount(0)
  await page.screenshot({ path: 'test-results/catalogo-claro.png' })
})

test('arrastrar una tarjeta empezando sobre su imagen coloca el mueble en el plano', async ({ page }) => {
  await amueblarDormitorio(page)
  const imagen = page.locator('.panel-catalogo__tarjeta[data-tipo="mesita"] img.panel-catalogo__miniatura')
  await expect.poll(() => imagen.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  // La imagen no recibe el puntero (pointer-events: none): se arrastra la tarjeta desde el punto donde está la imagen.
  const tarjeta = page.locator('.panel-catalogo__tarjeta[data-tipo="mesita"] .panel-catalogo__tipo')
  const caja = (await tarjeta.boundingBox())!
  const img = (await imagen.boundingBox())!
  const sobreLaImagen = { x: img.x + img.width / 2 - caja.x, y: img.y + img.height / 2 - caja.y }
  await tarjeta.dragTo(page.locator('.lienzo__svg'), { sourcePosition: sobreLaImagen })
  await expect.poll(() => tiposGuardados(page)).toEqual(['mesita'])
})
