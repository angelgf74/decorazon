import { expect, test, type Page } from '@playwright/test'

// Sin API: la petición se intercepta aquí y no sale del navegador. El envío de verdad, contra la API
// (que en Development nunca llega al buzón real), está en e2e/cuentas.

async function crearEstancia(page: Page) {
  await page.goto('/disenar')
  await page.getByRole('radio', { name: 'Dormitorio' }).check()
  await page.getByRole('button', { name: 'Crear estancia' }).click()
  await expect(page.locator('.barra__guardado')).toBeVisible()
}

test('desde el editor sin cuenta: se escribe, se manda con el correo y da las gracias', async ({ page }) => {
  const enviadas: unknown[] = []
  await page.route((url) => url.pathname === '/sugerencias', async (ruta) => {
    enviadas.push(ruta.request().postDataJSON())
    await ruta.fulfill({ status: 204 })
  })
  await crearEstancia(page)

  await page.getByRole('button', { name: 'Sugerencias' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Envíanos una sugerencia' })
  await dialogo.getByLabel('De qué va').selectOption({ label: 'Algo que echo en falta' })
  await dialogo.getByLabel('Tu sugerencia').fill('Poder medir distancias entre muebles')
  await dialogo.getByLabel('Tu correo').fill('ana@ejemplo.test')
  await dialogo.getByRole('button', { name: 'Enviar' }).click()

  await expect(dialogo.getByText('Gracias. Hemos recibido tu sugerencia.')).toBeVisible()
  expect(enviadas).toEqual([{ texto: 'Poder medir distancias entre muebles', tipo: 'funcionalidad', correo: 'ana@ejemplo.test' }])
  await dialogo.getByRole('button', { name: 'Cerrar' }).click()
  await expect(dialogo).toBeHidden()
})

/**
 * En la barra de arriba no cabe en un móvil sin recortar "2 Amueblar" o el estado de guardado: va en las pestañas de
 * abajo, que solo existen en móvil, y la barra se queda como estaba.
 */
for (const ancho of [320, 360, 390]) {
  test(`en un móvil de ${ancho} px está en las pestañas de abajo y la barra no cambia`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 740 })
    await crearEstancia(page)

    const boton = page.getByRole('button', { name: 'Sugerencias' })
    await expect(boton).toHaveCount(1)
    await expect(page.locator('.editor__pestanas').getByRole('button', { name: 'Sugerencias' })).toBeInViewport({ ratio: 1 })
    expect(await page.locator('.editor__pestanas').evaluate((p) => p.scrollWidth <= p.clientWidth)).toBe(true)

    await boton.click()
    await expect(page.getByRole('dialog', { name: 'Envíanos una sugerencia' })).toBeInViewport()
  })
}

test('en escritorio está en la barra de arriba', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await crearEstancia(page)

  await expect(page.locator('.barra').getByRole('button', { name: 'Sugerencias' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sugerencias' })).toHaveCount(1)
})
