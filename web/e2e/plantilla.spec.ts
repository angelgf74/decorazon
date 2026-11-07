import { expect, test } from '@playwright/test'

test('nueva estancia en L: la planta nace con seis paredes y sus seis cotas', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Empezar a diseñar' }).click()
  await page.getByRole('radio', { name: 'Salón' }).check()
  await page.getByRole('radio', { name: 'En L' }).check()
  await expect(page.getByLabel('Entrante ancho')).toBeVisible()
  await page.getByLabel('Esquina del entrante').selectOption('arriba-izquierda')
  await page.getByRole('button', { name: 'Crear estancia' }).click()
  await expect(page.locator('.lienzo__svg')).toBeVisible()
  await expect(page.locator('[data-cota]')).toHaveCount(6)
  // El panel de Estancia avisa de que no es rectangular (ya existía para las plantas partidas a mano).
  await expect(page.getByText('La estancia ya no es rectangular: cambia las paredes una a una')).toBeVisible()
})
