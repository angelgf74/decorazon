import { expect, test, type Page } from '@playwright/test'

const aviso = (page: Page, texto: string) => page.locator('.lista-avisos').getByRole('button', { name: new RegExp(texto) })

test('diseño anónimo: crear, amueblar, mover, deshacer, recargar y cambiar la estancia', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Empezar a diseñar' }).click()

  await page.getByRole('radio', { name: 'Dormitorio' }).check()
  await page.getByLabel('Ancho').fill('400')
  await page.getByLabel('Largo').fill('330')
  await page.getByLabel('Alto').fill('250')
  await page.getByRole('button', { name: 'Crear estancia' }).click()

  await page.getByRole('button', { name: '2 Amueblar' }).click()
  await page.getByRole('button', { name: /^Armario/ }).click()
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

  // El arrastre entero es un solo paso de deshacer y de rehacer.
  await page.keyboard.press('Control+z')
  await expect(aviso(page, 'se solapan').first()).toBeVisible()
  await page.keyboard.press('Control+y')
  await expect(aviso(page, 'se solapan')).toHaveCount(0)

  // Persiste en el navegador (el guardado se retrasa 500 ms).
  await expect(page.getByText('Guardado en este navegador')).toBeVisible()
  await page.reload()
  await expect(page.locator('[data-elemento]')).toHaveCount(2)
  await expect(page.getByText('Guardado en este navegador')).toBeVisible()

  // Estrechar la estancia no borra muebles: los deja como conflicto.
  await page.getByRole('button', { name: '1 Estancia' }).click()
  await page.getByLabel('Ancho', { exact: true }).fill('300')
  await page.getByLabel('Ancho', { exact: true }).press('Enter')
  await expect(page.locator('[data-elemento]')).toHaveCount(2)
  await expect(aviso(page, 'atraviesa la pared').first()).toBeVisible()
})
