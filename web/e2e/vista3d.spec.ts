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
  await page.getByRole('button', { name: /^Armario(?! de espejo| esquinero)/ }).click()
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

test.describe('vista 3D: sombras', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('la cama y el armario dejan en el suelo una sombra visible', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Empezar a diseñar' }).click()
    await page.getByRole('radio', { name: 'Dormitorio' }).check()
    await page.getByRole('button', { name: 'Crear estancia' }).click()
    await page.getByRole('button', { name: '2 Amueblar' }).click()
    await page.getByRole('button', { name: /^Armario(?! de espejo| esquinero)/ }).click()
    await page.getByRole('button', { name: /^Cama/ }).click()
    await expect(page.locator('[data-elemento]')).toHaveCount(2)
    // Armario contra la pared del fondo a la izquierda y cama en el centro, sin girar (dormitorio de 400 × 330 sin ventanas).
    await expect.poll(() => page.evaluate(() => localStorage.getItem('decorazon.disenoAnonimo')?.includes('"cama"') ?? false)).toBe(true)
    await page.evaluate(() => {
      const guardado = JSON.parse(localStorage.getItem('decorazon.disenoAnonimo')!)
      const doc = guardado.documento ?? guardado
      for (const e of doc.elementos) {
        e.rotacion = 0
        e.posicion = e.tipo === 'armario' ? { x: 80, y: 40 } : { x: 250, y: 200 }
      }
      localStorage.setItem('decorazon.disenoAnonimo', JSON.stringify(guardado))
    })
    await page.reload()
    await page.getByRole('button', { name: '3D', exact: true }).click()
    const lienzo = page.locator('canvas')
    await expect(lienzo).toBeVisible()

    // Brillo medio (9 × 9 px) en fracciones del lienzo: suelo a la sombra del armario y de la cama, y suelo libre lejos de ellos.
    const sombra = [[0.4, 0.59], [0.75, 0.63]]
    const libre = [[0.43, 0.86], [0.5, 0.81]]
    await expect.poll(async () => {
      const png = await lienzo.screenshot()
      const [s1, s2, l1, l2] = await page.evaluate(async ([b64, puntos]) => {
        const img = new Image()
        img.src = `data:image/png;base64,${b64}`
        await img.decode()
        const c = document.createElement('canvas')
        c.width = img.width
        c.height = img.height
        const ctx = c.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        return puntos.map(([fx, fy]) => {
          const d = ctx.getImageData(Math.round(img.width * fx) - 4, Math.round(img.height * fy) - 4, 9, 9).data
          let s = 0
          for (let i = 0; i < d.length; i += 4) s += (d[i] + d[i + 1] + d[i + 2]) / 3
          return s / (d.length / 4)
        })
      }, [png.toString('base64'), [...sombra, ...libre]] as const)
      const luz = (l1 + l2) / 2
      return luz > 150 && s1 < 0.86 * luz && s2 < 0.86 * luz ? 'sombra visible' : `sombras ${s1}, ${s2}; suelo libre ${l1}, ${l2}`
    }, { timeout: 15000 }).toBe('sombra visible')
  })
})
