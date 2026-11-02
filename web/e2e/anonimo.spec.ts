import { expect, test, type Page } from '@playwright/test'

const aviso = (page: Page, texto: string) => page.locator('.lista-avisos').getByRole('button', { name: new RegExp(texto) })

/** Espera a que el guardado retrasado (500 ms) pase por "Guardando…" y termine. */
async function esperarGuardado(page: Page) {
  const indicador = page.locator('.barra__guardado')
  await expect(indicador).toHaveText('Guardando…')
  await expect(indicador).toHaveText('Guardado en este navegador')
}

/** Posiciones de los elementos tal como están guardados en localStorage. */
const posicionesGuardadas = (page: Page) => page.evaluate(() => {
  const crudo = localStorage.getItem('decorazon.disenoAnonimo')
  if (crudo === null) return null
  const { documento } = JSON.parse(crudo) as { documento: { elementos: { id: string; posicion: { x: number; y: number } }[] } }
  return documento.elementos.map((e) => [e.id, e.posicion.x, e.posicion.y])
})

test('diseño anónimo: crear, amueblar, mover, deshacer, recargar y cambiar la estancia', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Empezar a diseñar' }).click()

  await page.getByRole('radio', { name: 'Dormitorio' }).check()
  await page.getByLabel('Ancho').fill('400')
  await page.getByLabel('Largo').fill('330')
  await page.getByLabel('Alto').fill('250')
  await page.getByRole('button', { name: 'Crear estancia' }).click()

  await page.getByRole('button', { name: '2 Amueblar' }).click()
  await page.getByRole('button', { name: /^Armario(?! de espejo)/ }).click()
  await page.getByRole('button', { name: /^Cama/ }).click()
  await expect(page.locator('[data-elemento]')).toHaveCount(2)
  await expect(aviso(page, 'se solapan').first()).toBeVisible()
  await expect(page.locator('[data-zona-conflicto]').first()).toBeAttached()

  // Arrastra la cama (la última añadida, encima del armario) al 80 % de la caja del suelo.
  const cama = page.locator('[data-elemento]').last()
  const suelo = (await page.locator('.capa-planta polygon').first().boundingBox())!
  const origen = (await cama.boundingBox())!
  const desde = { x: origen.x + origen.width / 2, y: origen.y + origen.height / 2 }
  const hasta = { x: suelo.x + suelo.width * 0.8, y: suelo.y + suelo.height * 0.8 }
  await page.mouse.move(desde.x, desde.y)
  await page.mouse.down()
  await page.mouse.move(desde.x + 10, desde.y + 10, { steps: 5 })
  await page.mouse.move(hasta.x, hasta.y, { steps: 30 })
  await page.mouse.up()
  await expect(aviso(page, 'se solapan')).toHaveCount(0)
  await esperarGuardado(page)
  const movidas = await posicionesGuardadas(page)

  // El arrastre entero es un solo paso de deshacer y de rehacer.
  await page.keyboard.press('Control+z')
  await expect(aviso(page, 'se solapan').first()).toBeVisible()
  await page.keyboard.press('Control+y')
  await expect(aviso(page, 'se solapan')).toHaveCount(0)

  // Persiste en el navegador con la cama ya movida (el guardado se retrasa 500 ms).
  await esperarGuardado(page)
  await expect.poll(() => posicionesGuardadas(page)).toEqual(movidas)
  await page.reload()
  await expect(page.locator('[data-elemento]')).toHaveCount(2)
  await expect(page.getByText('Guardado en este navegador')).toBeVisible()
  await expect(page.locator('.lista-avisos')).toBeVisible()
  await expect(aviso(page, 'se solapan')).toHaveCount(0)

  // Estrechar la estancia no borra muebles: los deja como conflicto.
  await page.getByRole('button', { name: '1 Estancia' }).click()
  await page.getByLabel('Ancho', { exact: true }).fill('300')
  await page.getByLabel('Ancho', { exact: true }).press('Enter')
  await expect(page.locator('[data-elemento]')).toHaveCount(2)
  await expect(aviso(page, 'atraviesa la pared').first()).toBeVisible()
})

test('vista 3D: los botones de la barra reciben clics reales del ratón', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Empezar a diseñar' }).click()
  await page.getByRole('button', { name: 'Crear estancia' }).click()
  await page.getByRole('button', { name: '3D', exact: true }).click()

  const boton = page.getByRole('button', { name: 'Ocultar paredes delante' })
  await expect(boton).toHaveAttribute('aria-pressed', 'true')
  const caja = (await boton.boundingBox())!
  await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2)
  await expect(boton).toHaveAttribute('aria-pressed', 'false')
  await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2)
  await expect(boton).toHaveAttribute('aria-pressed', 'true')
})

test('hoja para imprimir: plano, lista de muebles y la vista 3D capturada en su página', async ({ page }) => {
  await page.goto('/disenar')
  await page.getByRole('button', { name: 'Crear estancia' }).click()
  await page.getByRole('button', { name: '2 Amueblar' }).click()
  await page.getByRole('button', { name: /^Cama/ }).click()
  await page.getByRole('button', { name: 'Imprimir', exact: true }).click()

  const hoja = page.getByRole('dialog', { name: 'Hoja para imprimir' })
  await expect(hoja.getByRole('img', { name: 'Plano' })).toBeVisible()
  await expect(hoja.getByRole('table').getByRole('cell', { name: 'Cama', exact: true })).toBeVisible()
  // La imagen sale de un lienzo WebGL aparte; hasta tenerla no se puede imprimir.
  await expect(hoja.getByRole('img', { name: 'Vista 3D' })).toBeVisible({ timeout: 20_000 })
  await expect(hoja.getByRole('button', { name: 'Imprimir o guardar PDF' })).toBeEnabled()
  expect(await hoja.getByRole('img', { name: 'Vista 3D' }).getAttribute('src')).toMatch(/^data:image\/png;base64,/)

  await hoja.getByRole('button', { name: 'Cerrar' }).click()
  await expect(hoja).toBeHidden()
})
