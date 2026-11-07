import { expect, test, type Page } from '@playwright/test'

/** Posiciones de los elementos tal como están guardados en localStorage. */
const posicionesGuardadas = (page: Page) => page.evaluate(() => {
  const crudo = localStorage.getItem('decorazon.disenoAnonimo')
  if (crudo === null) return null
  const { documento } = JSON.parse(crudo) as { documento: { elementos: { id: string; posicion: { x: number; y: number } }[] } }
  return documento.elementos.map((e) => ({ id: e.id, x: e.posicion.x, y: e.posicion.y }))
})

// Arrastrar un mueble por encima de otro y más allá: el arrastre no se corta a mitad. (Ordenar los <g> del plano por
// posición reordenaba el DOM durante el arrastre y el navegador soltaba la captura del puntero al recolocar el nodo.)
test('arrastrar una mesita hacia abajo pasando por encima de otra llega hasta donde se suelta', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Empezar a diseñar' }).click()
  await page.getByRole('radio', { name: 'Dormitorio' }).check()
  await page.getByRole('button', { name: 'Crear estancia' }).click()
  await page.getByRole('button', { name: '2 Amueblar' }).click()
  // Dos mesitas en el centro: la segunda nace encima de la primera y se lleva arriba con el teclado (10 cm por pulsación).
  await page.locator('.panel-catalogo').getByRole('button', { name: /^Mesita/ }).click()
  await page.locator('.panel-catalogo').getByRole('button', { name: /^Mesita/ }).click()
  for (let i = 0; i < 8; i++) await page.keyboard.press('Shift+ArrowUp')
  await expect.poll(() => posicionesGuardadas(page)).toHaveLength(2)
  const antes = (await posicionesGuardadas(page))!
  const arriba = antes.reduce((a, b) => (a.y < b.y ? a : b))
  const abajo = antes.find((e) => e.id !== arriba.id)!
  expect(arriba.y).toBeLessThan(abajo.y - 60)

  // Se arrastra la de arriba hacia abajo, cruzando a la otra, hasta 100 cm por debajo de ella.
  const pieza = page.locator(`[data-elemento="${arriba.id}"]`)
  const suelo = (await page.locator('.capa-planta polygon').first().boundingBox())!
  const origen = (await pieza.boundingBox())!
  const escala = suelo.width / 400
  const desde = { x: origen.x + origen.width / 2, y: origen.y + origen.height / 2 }
  const hasta = { x: desde.x, y: suelo.y + (abajo.y + 100) * escala }
  await page.mouse.move(desde.x, desde.y)
  await page.mouse.down()
  await page.mouse.move(desde.x + 5, desde.y + 10, { steps: 5 })
  await page.mouse.move(hasta.x, hasta.y, { steps: 40 })
  await page.mouse.up()

  await expect.poll(async () => (await posicionesGuardadas(page))!.find((e) => e.id === arriba.id)!.y).toBeGreaterThan(abajo.y + 80)
})

// M-02: Mayúsculas+clic añade a la selección y arrastrar uno del grupo mueve los dos lo mismo.
test('dos mesitas seleccionadas con Mayúsculas se arrastran juntas', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Empezar a diseñar' }).click()
  await page.getByRole('radio', { name: 'Dormitorio' }).check()
  await page.getByRole('button', { name: 'Crear estancia' }).click()
  await page.getByRole('button', { name: '2 Amueblar' }).click()
  await page.locator('.panel-catalogo').getByRole('button', { name: /^Mesita/ }).click()
  await page.locator('.panel-catalogo').getByRole('button', { name: /^Mesita/ }).click()
  for (let i = 0; i < 8; i++) await page.keyboard.press('Shift+ArrowUp')
  await expect.poll(() => posicionesGuardadas(page)).toHaveLength(2)
  const antes = (await posicionesGuardadas(page))!
  const [a, b] = antes.map((e) => page.locator(`[data-elemento="${e.id}"] polygon.capa-elementos__huella`).first())
  await a!.click()
  await b!.click({ modifiers: ['Shift'] })
  await expect(page.getByRole('heading', { name: '2 muebles seleccionados' })).toBeVisible()

  const caja = (await b!.boundingBox())!
  const desde = { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 }
  await page.mouse.move(desde.x, desde.y)
  await page.mouse.down()
  await page.mouse.move(desde.x + 5, desde.y + 5, { steps: 3 })
  await page.mouse.move(desde.x + 80, desde.y + 40, { steps: 20 })
  await page.mouse.up()

  await expect.poll(async () => {
    const despues = (await posicionesGuardadas(page))!
    const d = despues.map((e, i) => ({ dx: e.x - antes[i]!.x, dy: e.y - antes[i]!.y }))
    return d[0]!.dx > 10 && d[0]!.dx === d[1]!.dx && d[0]!.dy === d[1]!.dy
  }).toBe(true)
})
