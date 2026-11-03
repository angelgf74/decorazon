// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAVE_SESION, conectarSesionConApi, reiniciarSesion, sesion } from '../../cuenta/sesion'
import { CLAVE_DUENO_COPIAS, guardarCopiaLocal, leerCopiaLocal } from '../../editor/persistencia/local'
import { documentoNuevo } from '../../nucleo'
import { respuesta } from '../../pruebas/respuesta'
import MisDisenos from './MisDisenos'

// Sin WebGL en jsdom: el generador de la vista previa entrega una imagen al momento.
vi.mock('../vistaPrevia/GeneradorDeVistaPrevia', () => ({
  default: ({ alTerminar }: { alTerminar(b: Blob | null): void }) => {
    queueMicrotask(() => alTerminar(new Blob(['jpeg'], { type: 'image/jpeg' })))
    return null
  },
}))

const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()

function resumen(id: string, nombre: string, modificado: string, tipo = 'cocina') {
  return { id, nombre, tipoEstancia: tipo, fechaDeCreacion: modificado, fechaDeModificacion: modificado, version: 1 }
}
const ANTIGUO = resumen('a', 'Antiguo', '2025-01-01T10:00:00Z', 'dormitorio')
const RECIENTE = resumen('b', 'Reciente', new Date(Date.now() - 5 * 60_000).toISOString(), 'salon')

function montar() {
  render(
    <MemoryRouter initialEntries={['/disenos']}>
      <Routes>
        <Route path="/disenos" element={<MisDisenos />} />
        <Route path="/disenos/:id" element={<p>editor</p>} />
        <Route path="/entrar" element={<p>entrar</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

/** La API de compartir el diseño «b»: leerlo, subir su vista previa y crear el enlace. */
function servirCompartir({ vistaPrevia = 204 }: { vistaPrevia?: number } = {}) {
  const doc = documentoNuevo('salon', 400, 300, 250)
  fetchSimulado.mockImplementation(async (p) => {
    const ruta = `${p.method} ${new URL(p.url).pathname}`
    if (ruta === 'GET /disenos/b') return respuesta(200, { ...RECIENTE, contenido: doc, enlace: null })
    if (ruta === 'PUT /disenos/b/vista-previa') return respuesta(vistaPrevia, vistaPrevia >= 400 ? { mensaje: 'falla' } : undefined)
    if (ruta === 'PUT /disenos/b/enlace') return respuesta(200, { enlace: 'tok_1' })
    return respuesta(404, { mensaje: 'no' })
  })
}

const rutas = () => fetchSimulado.mock.calls.map(([p]) => `${p.method} ${new URL(p.url).pathname}`)

function conSesion() {
  localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: new Date(Date.now() + 86_400_000).toISOString() }))
  reiniciarSesion()
}

beforeEach(() => {
  localStorage.clear()
  fetchSimulado.mockReset()
  vi.stubGlobal('fetch', fetchSimulado)
  reiniciarSesion()
  conectarSesionConApi()
})
afterEach(() => vi.unstubAllGlobals())

describe('MisDisenos', () => {
  it('lista los diseños del más reciente al más antiguo', async () => {
    conSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, [ANTIGUO, RECIENTE]))
    montar()
    const filas = await screen.findAllByRole('listitem')
    expect(filas).toHaveLength(2)
    expect(within(filas[0]!).getByText('Reciente')).toBeInTheDocument()
    expect(within(filas[0]!).getByText('Salón')).toBeInTheDocument()
    expect(within(filas[0]!).getByText('hace 5 min')).toBeInTheDocument()
    expect(within(filas[1]!).getByText('Antiguo')).toBeInTheDocument()
    expect(within(filas[1]!).getByText('Dormitorio')).toBeInTheDocument()
  })

  it('un diseño compartido lleva la marca «Compartido»', async () => {
    conSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, [{ ...RECIENTE, enlace: 'tok' }, ANTIGUO]))
    montar()
    const filas = await screen.findAllByRole('listitem')
    expect(within(filas[0]!).getByText('Compartido')).toBeInTheDocument()
    expect(within(filas[1]!).queryByText('Compartido')).toBeNull()
  })

  it('Compartir: «Crear enlace» pide el enlace y lo enseña para copiarlo, y la fila pasa a compartida', async () => {
    conSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, [RECIENTE]))
    montar()
    const fila = (await screen.findByText('Reciente')).closest('li')!
    await userEvent.click(within(fila).getByRole('button', { name: 'Compartir' }))
    const dialogo = screen.getByRole('dialog', { name: 'Compartir «Reciente»' })
    servirCompartir()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Crear enlace' }))
    const campo = await within(dialogo).findByLabelText('Enlace')
    expect((campo as HTMLInputElement).value).toBe(`${location.origin}/compartido/tok_1`)
    expect(within(dialogo).getByRole('button', { name: 'Copiar enlace' })).toBeInTheDocument()
    expect(rutas()).toContain('PUT /disenos/b/enlace')
    expect(within(fila).getByText('Compartido')).toBeInTheDocument()
    // El botón pulsado desaparece: el foco pasa a «Copiar enlace» en vez de perderse.
    expect(document.activeElement).toBe(within(dialogo).getByRole('button', { name: 'Copiar enlace' }))
  })

  it('«Copiar enlace» lo copia al portapapeles y lo anuncia en una región que ya estaba', async () => {
    conSesion()
    const escribir = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: escribir } })
    fetchSimulado.mockResolvedValueOnce(respuesta(200, [{ ...RECIENTE, enlace: 'tok_1' }]))
    montar()
    const fila = (await screen.findByText('Reciente')).closest('li')!
    await userEvent.click(within(fila).getByRole('button', { name: 'Compartir' }))
    const dialogo = screen.getByRole('dialog', { name: 'Compartir «Reciente»' })
    const estado = within(dialogo).getByRole('status')
    expect(estado).toHaveTextContent('')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Copiar enlace' }))
    expect(escribir).toHaveBeenCalledWith(`${location.origin}/compartido/tok_1`)
    expect(within(dialogo).getByRole('status')).toBe(estado)
    expect(estado).toHaveTextContent('Enlace copiado')
  })

  it('antes de crear el enlace hace la vista previa y la sube: quien pegue el enlace enseguida ya ve la imagen', async () => {
    conSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, [RECIENTE]))
    montar()
    const fila = (await screen.findByText('Reciente')).closest('li')!
    await userEvent.click(within(fila).getByRole('button', { name: 'Compartir' }))
    const dialogo = screen.getByRole('dialog', { name: 'Compartir «Reciente»' })
    servirCompartir()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Crear enlace' }))
    await within(dialogo).findByLabelText('Enlace')
    expect(rutas().slice(1)).toEqual(['GET /disenos/b', 'PUT /disenos/b/vista-previa', 'PUT /disenos/b/enlace'])
  })

  it('si la vista previa falla, el enlace se crea igual (la tarjeta saldrá con el icono)', async () => {
    conSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, [RECIENTE]))
    montar()
    const fila = (await screen.findByText('Reciente')).closest('li')!
    await userEvent.click(within(fila).getByRole('button', { name: 'Compartir' }))
    const dialogo = screen.getByRole('dialog', { name: 'Compartir «Reciente»' })
    servirCompartir({ vistaPrevia: 500 })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Crear enlace' }))
    expect(await within(dialogo).findByLabelText('Enlace')).toBeInTheDocument()
    expect(within(dialogo).queryByRole('alert')).toBeNull()
  })

  it('Dejar de compartir, tras confirmarlo, retira el enlace y quita la marca', async () => {
    conSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, [{ ...RECIENTE, enlace: 'tok_1' }]))
    montar()
    const fila = (await screen.findByText('Reciente')).closest('li')!
    await userEvent.click(within(fila).getByRole('button', { name: 'Compartir' }))
    const dialogo = screen.getByRole('dialog', { name: 'Compartir «Reciente»' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Dejar de compartir' }))
    expect(document.activeElement).toBe(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    expect(document.activeElement).toBe(within(dialogo).getByRole('button', { name: 'Dejar de compartir' }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Dejar de compartir' }))
    fetchSimulado.mockResolvedValueOnce(respuesta(204))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Sí, dejar de compartir' }))
    await vi.waitFor(() => expect(within(fila).queryByText('Compartido')).toBeNull())
    const peticion = fetchSimulado.mock.calls[1]![0]
    expect(peticion.method).toBe('DELETE')
    expect(new URL(peticion.url).pathname).toBe('/disenos/b/enlace')
    expect(document.activeElement).toBe(within(dialogo).getByRole('button', { name: 'Crear enlace' }))
  })

  it('borrar con confirmación llama a DELETE, quita la fila y la copia local', async () => {
    conSesion()
    guardarCopiaLocal(localStorage, 'a', { version: 1, documento: documentoNuevo('salon', 400, 300, 250), pendiente: false })
    fetchSimulado.mockResolvedValueOnce(respuesta(200, [ANTIGUO, RECIENTE]))
    montar()
    const fila = (await screen.findByText('Antiguo')).closest('li')!
    await userEvent.click(within(fila).getByRole('button', { name: 'Borrar' }))
    const mensaje = screen.getByText('¿Borrar «Antiguo»? No se puede deshacer.')
    fetchSimulado.mockResolvedValueOnce(respuesta(204))
    await userEvent.click(within(mensaje.closest('dialog')!).getByRole('button', { name: 'Borrar' }))
    await vi.waitFor(() => expect(screen.queryByText('Antiguo')).not.toBeInTheDocument())
    expect(leerCopiaLocal(localStorage, 'a')).toBeNull()
    const peticion = fetchSimulado.mock.calls[1]![0]
    expect(peticion.method).toBe('DELETE')
    expect(new URL(peticion.url).pathname).toBe('/disenos/a')
  })

  it('duplicar con 409 muestra el aviso del límite', async () => {
    conSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, [RECIENTE]))
    montar()
    const fila = (await screen.findByText('Reciente')).closest('li')!
    fetchSimulado.mockResolvedValueOnce(respuesta(409, { mensaje: 'Has llegado al límite de 100 diseños' }))
    await userEvent.click(within(fila).getByRole('button', { name: 'Duplicar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Has llegado al límite de 100 diseños')
  })

  it('duplicar un diseño que ya no existe recarga la lista', async () => {
    conSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, [RECIENTE]))
    montar()
    const fila = (await screen.findByText('Reciente')).closest('li')!
    fetchSimulado
      .mockResolvedValueOnce(respuesta(404, { mensaje: 'No existe' }))
      .mockResolvedValueOnce(respuesta(200, []))
    await userEvent.click(within(fila).getByRole('button', { name: 'Duplicar' }))
    expect(await screen.findByText('Aún no tienes diseños')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('No existe')
    const listados = fetchSimulado.mock.calls.filter(([p]) => p.method === 'GET' && new URL(p.url).pathname === '/disenos')
    expect(listados).toHaveLength(2)
  })

  it('borrar un diseño que ya no existe lo quita de la lista y de las copias', async () => {
    conSesion()
    guardarCopiaLocal(localStorage, 'a', { version: 1, documento: documentoNuevo('salon', 400, 300, 250), pendiente: false })
    fetchSimulado.mockResolvedValueOnce(respuesta(200, [ANTIGUO, RECIENTE]))
    montar()
    const fila = (await screen.findByText('Antiguo')).closest('li')!
    await userEvent.click(within(fila).getByRole('button', { name: 'Borrar' }))
    const mensaje = screen.getByText('¿Borrar «Antiguo»? No se puede deshacer.')
    fetchSimulado.mockResolvedValueOnce(respuesta(404, { mensaje: 'No existe' }))
    await userEvent.click(within(mensaje.closest('dialog')!).getByRole('button', { name: 'Borrar' }))
    await vi.waitFor(() => expect(screen.queryByText('Antiguo')).not.toBeInTheDocument())
    expect(leerCopiaLocal(localStorage, 'a')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('una fecha inválida se ve como "Sin fecha" y va al final', async () => {
    conSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, [resumen('x', 'Rota', 'no es una fecha'), ANTIGUO, RECIENTE]))
    montar()
    const filas = await screen.findAllByRole('listitem')
    expect(within(filas[0]!).getByText('Reciente')).toBeInTheDocument()
    expect(within(filas[1]!).getByText('Antiguo')).toBeInTheDocument()
    expect(within(filas[2]!).getByText('Rota')).toBeInTheDocument()
    expect(within(filas[2]!).getByText('Sin fecha')).toBeInTheDocument()
    expect(screen.queryByText(/Invalid Date/)).toBeNull()
  })

  it('un tipo "constructor" no se toma por un tipo de estancia', async () => {
    conSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, [resumen('x', 'Raro', '2025-01-01T10:00:00Z', 'constructor')]))
    montar()
    const fila = (await screen.findByText('Raro')).closest('li')!
    expect(within(fila).getByText('constructor')).toBeInTheDocument()
  })

  it('renombrar con 412 recarga la lista y avisa', async () => {
    conSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, [RECIENTE]))
    montar()
    const fila = (await screen.findByText('Reciente')).closest('li')!
    await userEvent.click(within(fila).getByRole('button', { name: 'Renombrar' }))
    const campo = screen.getByLabelText('Nombre del diseño')
    await userEvent.clear(campo)
    await userEvent.type(campo, 'Otro')
    fetchSimulado
      .mockResolvedValueOnce(respuesta(200, { ...RECIENTE, version: 2, contenido: documentoNuevo('salon', 400, 300, 250) }))
      .mockResolvedValueOnce(respuesta(412, { mensaje: 'Versión distinta', version: 2 }))
      .mockResolvedValueOnce(respuesta(200, [{ ...RECIENTE, nombre: 'Cambiado', version: 2 }]))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Cambiado')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('ha cambiado en otro sitio')
    expect(fetchSimulado.mock.calls[2]![0].headers.get('If-Match')).toBe('"1"')
  })

  it('renombrar envía el diseño entero, con el contenido guardado y la versión de la lista', async () => {
    conSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, [RECIENTE]))
    montar()
    const fila = (await screen.findByText('Reciente')).closest('li')!
    await userEvent.click(within(fila).getByRole('button', { name: 'Renombrar' }))
    const campo = screen.getByLabelText('Nombre del diseño')
    await userEvent.clear(campo)
    await userEvent.type(campo, 'Otro')
    const contenido = documentoNuevo('salon', 420, 300, 250)
    fetchSimulado
      .mockResolvedValueOnce(respuesta(200, { ...RECIENTE, contenido }))
      .mockResolvedValueOnce(respuesta(200, { ...RECIENTE, nombre: 'Otro', version: 2, contenido }))
      .mockResolvedValueOnce(respuesta(200, [{ ...RECIENTE, nombre: 'Otro', version: 2 }]))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Otro')).toBeInTheDocument()
    const peticion = fetchSimulado.mock.calls[2]![0]
    expect(peticion.method).toBe('PUT')
    expect(peticion.headers.get('If-Match')).toBe('"1"')
    expect(await peticion.json()).toEqual({ nombre: 'Otro', tipoEstancia: 'salon', contenido: JSON.parse(JSON.stringify(contenido)) })
  })

  it('sin diseños muestra el vacío y el botón de crear', async () => {
    conSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, []))
    montar()
    expect(await screen.findByText('Aún no tienes diseños')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nuevo diseño' })).toBeInTheDocument()
  })

  it('crea un diseño desde el diálogo y navega a él', async () => {
    conSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, []))
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo diseño' }))
    fetchSimulado.mockImplementationOnce(async (p) => {
      const c = (await p.json()) as { nombre: string; tipoEstancia: string; contenido: unknown }
      return respuesta(201, { ...resumen('nuevo', c.nombre, '2026-01-01T00:00:00Z', c.tipoEstancia), contenido: c.contenido })
    })
    await userEvent.click(screen.getByRole('radio', { name: 'Salón' }))
    await userEvent.click(screen.getByRole('button', { name: 'Crear estancia' }))
    expect(await screen.findByText('editor')).toBeInTheDocument()
  })

  it('si el navegador cierra el diálogo de nuevo diseño por su cuenta, se cierra y "Nuevo diseño" vuelve a abrirlo', async () => {
    conSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, []))
    montar()
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo diseño' }))
    const dialogo = screen.getByRole('button', { name: 'Crear estancia' }).closest('dialog')!
    act(() => {
      dialogo.removeAttribute('open')
      fireEvent(dialogo, new Event('close'))
    })
    expect(screen.queryByRole('button', { name: 'Crear estancia' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Nuevo diseño' }))
    expect(screen.getByRole('button', { name: 'Crear estancia' }).closest('dialog')).toHaveAttribute('open')
  })

  it('sin sesión navega a /entrar?volver=/disenos', async () => {
    montar()
    expect(await screen.findByText('entrar')).toBeInTheDocument()
    expect(fetchSimulado).not.toHaveBeenCalled()
  })
})

describe('MisDisenos sin conexión o con la carga fallida', () => {
  const doc = documentoNuevo('salon', 400, 300, 250)

  it('sin conexión lista las copias de este navegador, solo para abrir, con un aviso', async () => {
    conSesion()
    localStorage.setItem(CLAVE_DUENO_COPIAS, 'ana@x.es')
    guardarCopiaLocal(localStorage, 'c1', { version: 3, nombre: 'Cocina de casa', documento: doc, pendiente: true })
    guardarCopiaLocal(localStorage, 'c2', { version: 1, documento: doc, pendiente: false })
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    montar()
    expect(await screen.findByText('Sin conexión: estos son los diseños guardados en este navegador')).toBeInTheDocument()
    expect(screen.queryByText('Aún no tienes diseños')).toBeNull()
    const filas = screen.getAllByRole('listitem')
    expect(filas).toHaveLength(2)
    const fila = screen.getByText('Cocina de casa').closest('li')!
    expect(within(fila).getByText('ahora mismo')).toBeInTheDocument()
    expect(within(fila).queryByRole('button', { name: 'Renombrar' })).toBeNull()
    expect(within(fila).queryByRole('button', { name: 'Duplicar' })).toBeNull()
    expect(within(fila).queryByRole('button', { name: 'Borrar' })).toBeNull()
    expect(screen.getByText('Diseño sin título')).toBeInTheDocument()
    await userEvent.click(within(fila).getByRole('button', { name: 'Abrir' }))
    expect(await screen.findByText('editor')).toBeInTheDocument()
  })

  it('sin conexión no muestra copias de otra cuenta', async () => {
    conSesion()
    sesion.setState({ usuario: { nombre: 'Ana', correo: 'ana@x.es' } })
    localStorage.setItem(CLAVE_DUENO_COPIAS, 'otra@x.es')
    guardarCopiaLocal(localStorage, 'c1', { version: 3, nombre: 'De otra', documento: doc, pendiente: false })
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    montar()
    expect(await screen.findByText('Sin conexión: estos son los diseños guardados en este navegador')).toBeInTheDocument()
    expect(screen.queryByText('De otra')).toBeNull()
    expect(screen.queryByText('Aún no tienes diseños')).toBeNull()
  })

  it('sin conexión y sin copias no dice que no hay diseños', async () => {
    conSesion()
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    montar()
    expect(await screen.findByText('Sin conexión: estos son los diseños guardados en este navegador')).toBeInTheDocument()
    expect(screen.queryByText('Aún no tienes diseños')).toBeNull()
    expect(screen.queryByText('Cargando…')).toBeNull()
  })

  it('si el servidor falla, muestra el error y no dice que no hay diseños', async () => {
    conSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(500, { mensaje: 'Algo ha fallado' }))
    montar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo ha fallado')
    expect(screen.queryByText('Aún no tienes diseños')).toBeNull()
    expect(screen.queryByText('Cargando…')).toBeNull()
  })
})
