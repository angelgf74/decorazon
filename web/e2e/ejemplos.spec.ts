import { expect, test } from '@playwright/test'

test('abrir una copia del dormitorio de ejemplo: muebles en el plano y vista 3D', async ({ page }) => {
  await page.goto('/')
  const tarjeta = page.getByRole('article', { name: /^Dormitorio/ })
  await tarjeta.getByRole('button', { name: 'Abrir una copia' }).click()
  await expect(page).toHaveURL(/\/disenar$/)
  await expect(page.locator('[data-elemento]').first()).toBeVisible()
  expect(await page.locator('[data-elemento]').count()).toBeGreaterThanOrEqual(5)
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await expect(page.locator('canvas')).toBeVisible()
})

test.describe('guía del primer uso', () => {
  // Sin la marca que el resto de los e2e llevan puesta.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('aparece al crear la primera estancia, «Saltar» la cierra y no vuelve al recargar', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Empezar a diseñar' }).click()
    await page.getByRole('radio', { name: 'Salón' }).check()
    await page.getByRole('button', { name: 'Crear estancia' }).click()
    const guia = page.getByRole('region', { name: 'Primeros pasos' })
    await expect(guia).toBeVisible()
    await expect(guia.getByText('1 de 3')).toBeVisible()
    await guia.getByRole('button', { name: 'Siguiente' }).click()
    await expect(guia.getByText('2 de 3')).toBeVisible()
    await guia.getByRole('button', { name: 'Saltar' }).click()
    await expect(guia).toBeHidden()
    // La marca sobrevive a la recarga: la siguiente estancia nueva ya no la enseña.
    await page.reload()
    await expect(page.locator('.lienzo__svg')).toBeVisible()
    await page.getByRole('button', { name: 'Más acciones' }).click()
    await page.getByRole('button', { name: 'Nuevo diseño' }).click()
    await page.getByRole('button', { name: 'Aceptar' }).click()
    await page.getByRole('radio', { name: 'Cocina' }).check()
    await page.getByRole('button', { name: 'Crear estancia' }).click()
    await expect(page.locator('.lienzo__svg')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Primeros pasos' })).toBeHidden()
  })
})
