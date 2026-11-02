import { expect, test, type Page } from '@playwright/test'
import { enlaceDelUltimoCorreo } from './correo'

// Una cuenta por ejecución, que las pruebas recorren en orden hasta borrarla.
const correo = `e2e-${Date.now()}@ejemplo.test`
const contrasena = 'contraseña-de-prueba-1'
const contrasenaNueva = 'contraseña-de-prueba-2'
let idDiseno = ''

test.describe.configure({ mode: 'serial' })

const indicador = (page: Page) => page.locator('.barra__guardado')
const armario = (page: Page) => page.locator('[data-elemento]').first()

async function entrar(page: Page, clave: string) {
  await page.goto('/entrar')
  await page.getByLabel('Correo').fill(correo)
  await page.getByLabel('Contraseña', { exact: true }).fill(clave)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

async function abrirDiseno(page: Page) {
  await page.goto(`/disenos/${idDiseno}`)
  await expect(indicador(page)).toHaveText('Guardado')
  await expect(page.locator('[data-elemento]')).toHaveCount(1)
}

/** Arrastra el armario hasta esa fracción de la caja del suelo. */
async function moverArmario(page: Page, fx: number, fy: number) {
  const suelo = (await page.locator('.capa-planta polygon').first().boundingBox())!
  const origen = (await armario(page).boundingBox())!
  const desde = { x: origen.x + origen.width / 2, y: origen.y + origen.height / 2 }
  await page.mouse.move(desde.x, desde.y)
  await page.mouse.down()
  await page.mouse.move(desde.x + 10, desde.y + 10, { steps: 5 })
  await page.mouse.move(suelo.x + suelo.width * fx, suelo.y + suelo.height * fy, { steps: 30 })
  await page.mouse.up()
}

type Punto = { x: number; y: number }

async function centroDelArmario(page: Page): Promise<Punto> {
  const caja = (await armario(page).boundingBox())!
  return { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 }
}

/** Píxeles entre el armario y ese punto: el halo de la selección y el redondeo a 2 decimales mueven alguno. */
async function distanciaDelArmarioA(page: Page, p: Punto) {
  const c = await centroDelArmario(page)
  return Math.hypot(c.x - p.x, c.y - p.y)
}

async function esperarGuardadoEnServidor(page: Page) {
  await expect(indicador(page)).toHaveText('Guardando…')
  await expect(indicador(page)).toHaveText('Guardado')
}

test('diseñar sin cuenta, registrarse y encontrar el diseño en la cuenta', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Empezar a diseñar' }).click()
  await page.getByRole('button', { name: 'Crear estancia' }).click()
  await page.getByRole('button', { name: '2 Amueblar' }).click()
  await page.getByRole('button', { name: /^Armario(?! de espejo)/ }).click()
  await expect(page.locator('[data-elemento]')).toHaveCount(1)

  await page.getByRole('link', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Tu diseño actual se guardará en tu cuenta')).toBeVisible()
  await page.getByLabel('Correo').fill(correo)
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page.getByRole('status')).toBeVisible()

  await page.goto(await enlaceDelUltimoCorreo(correo, '/registro/confirmar'))
  await page.getByLabel('Nombre').fill('Prueba E2E')
  await page.getByLabel('Contraseña', { exact: true }).fill(contrasena)
  await page.getByLabel('Repite la contraseña').fill(contrasena)
  await page.getByRole('button', { name: 'Crear la cuenta' }).click()
  await expect(page).toHaveURL(/\/entrar$/)
  await expect(page.getByText(/^Cuenta creada/)).toBeVisible()

  // El diseño anónimo viajó con el registro: no se pregunta si guardarlo.
  await page.getByLabel('Correo').fill(correo)
  await page.getByLabel('Contraseña', { exact: true }).fill(contrasena)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/disenos$/)
  await expect(page.getByText('¿Guardar este diseño en tu cuenta?')).toHaveCount(0)

  const fila = page.locator('.disenos__fila').filter({ hasText: 'Mi primer diseño' })
  await expect(fila).toHaveCount(1)
  await fila.getByRole('button', { name: 'Abrir' }).click()
  await expect(page).toHaveURL(/\/disenos\/[0-9a-f-]+$/)
  await expect(page.locator('[data-elemento]')).toHaveCount(1)
  idDiseno = new URL(page.url()).pathname.split('/').at(-1)!
})

test('lo movido se guarda solo en el servidor y sigue ahí al recargar', async ({ page }) => {
  await entrar(page, contrasena)
  await expect(page).toHaveURL(/\/disenos$/)
  await abrirDiseno(page)
  const antes = await centroDelArmario(page)

  await moverArmario(page, 0.8, 0.8)
  await esperarGuardadoEnServidor(page)
  const movido = await centroDelArmario(page)
  expect(Math.hypot(movido.x - antes.x, movido.y - antes.y)).toBeGreaterThan(100)

  await page.reload()
  await expect(indicador(page)).toHaveText('Guardado')
  await expect.poll(() => distanciaDelArmarioA(page, movido)).toBeLessThan(3)
})

test('dos pestañas: la segunda ve el aviso y recarga la versión de la primera', async ({ page, context }) => {
  await entrar(page, contrasena)
  await expect(page).toHaveURL(/\/disenos$/)
  await abrirDiseno(page)
  const otra = await context.newPage()
  await abrirDiseno(otra)

  await moverArmario(page, 0.25, 0.25)
  await esperarGuardadoEnServidor(page)
  const deLaPrimera = await centroDelArmario(page)

  await moverArmario(otra, 0.75, 0.25)
  await expect(otra.getByText(/^Este diseño se ha guardado desde otro sitio/)).toBeVisible()
  await otra.getByRole('button', { name: 'Recargar la versión guardada' }).click()
  await expect(indicador(otra)).toHaveText('Guardado')
  await expect.poll(() => distanciaDelArmarioA(otra, deLaPrimera)).toBeLessThan(3)
})

test('contraseña olvidada: el enlace del correo permite elegir otra y entrar con ella', async ({ page }) => {
  await page.goto('/entrar')
  await page.getByRole('link', { name: '¿Has olvidado la contraseña?' }).click()
  await expect(page.getByRole('heading', { name: 'Contraseña olvidada' })).toBeVisible()
  await page.getByLabel('Correo').fill(correo)
  await page.getByRole('button', { name: 'Enviar enlace' }).click()
  await expect(page.getByRole('status')).toBeVisible()

  await page.goto(await enlaceDelUltimoCorreo(correo, '/contrasena/restablecer'))
  await page.getByLabel('Contraseña nueva').fill(contrasenaNueva)
  await page.getByLabel('Repite la contraseña').fill(contrasenaNueva)
  await page.getByRole('button', { name: 'Cambiar la contraseña' }).click()
  await expect(page).toHaveURL(/\/entrar$/)

  await entrar(page, contrasenaNueva)
  await expect(page).toHaveURL(/\/disenos$/)
  await expect(page.locator('.disenos__fila').filter({ hasText: 'Mi primer diseño' })).toHaveCount(1)
})

test('compartir: el enlace se abre sin sesión, enseña el diseño y deja copiarlo; al retirarlo deja de funcionar', async ({ page, browser }) => {
  await entrar(page, contrasenaNueva)
  await expect(page).toHaveURL(/\/disenos$/)
  const fila = page.locator('.disenos__fila').filter({ hasText: 'Mi primer diseño' })
  await fila.getByRole('button', { name: 'Compartir' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Compartir «Mi primer diseño»' })
  await dialogo.getByRole('button', { name: 'Crear enlace' }).click()
  const enlace = await dialogo.getByLabel('Enlace').inputValue()
  expect(enlace).toMatch(/^http:\/\/localhost:5322\/compartido\/[A-Za-z0-9_-]+$/)
  await expect(fila.getByText('Compartido')).toBeVisible()

  // Otra persona, sin sesión ni nada en su navegador.
  const invitado = await browser.newContext()
  const suya = await invitado.newPage()
  await suya.goto(enlace)
  await expect(suya.getByRole('heading', { level: 1, name: 'Mi primer diseño' })).toBeVisible()
  await expect(suya.getByRole('img', { name: 'Plano' }).locator('[data-elemento]')).toHaveCount(1)
  await expect(suya.getByRole('table')).toContainText('Armario')
  await suya.getByRole('button', { name: 'Hacer una copia' }).click()
  await expect(suya).toHaveURL(/\/disenar$/)
  await expect(suya.locator('[data-elemento]')).toHaveCount(1)

  await dialogo.getByRole('button', { name: 'Dejar de compartir' }).click()
  await dialogo.getByRole('button', { name: 'Sí, dejar de compartir' }).click()
  await expect(fila.getByText('Compartido')).toHaveCount(0)
  await suya.goto(enlace)
  await expect(suya.getByRole('heading', { name: 'Este enlace ya no funciona' })).toBeVisible()
  await invitado.close()
})

test('borrar la cuenta vuelve al inicio y ya no se puede entrar con ella', async ({ page }) => {
  await entrar(page, contrasenaNueva)
  await expect(page).toHaveURL(/\/disenos$/)
  await page.goto('/cuenta')
  await page.getByRole('button', { name: 'Borrar mi cuenta' }).click()
  await page.getByLabel('Tu contraseña').fill(contrasenaNueva)
  await page.getByRole('button', { name: 'Borrar la cuenta' }).click()
  await expect(page).toHaveURL(/:5322\/$/)
  await expect(page.getByText('Tu cuenta se ha borrado.')).toBeVisible()

  await entrar(page, contrasenaNueva)
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/entrar$/)
})
