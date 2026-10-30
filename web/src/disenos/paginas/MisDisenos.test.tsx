// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAVE_SESION, conectarSesionConApi, reiniciarSesion } from '../../cuenta/sesion'
import { respuesta } from '../../pruebas/respuesta'
import MisDisenos from './MisDisenos'

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

  it('borrar con confirmación llama a DELETE y quita la fila', async () => {
    conSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, [ANTIGUO, RECIENTE]))
    montar()
    const fila = (await screen.findByText('Antiguo')).closest('li')!
    await userEvent.click(within(fila).getByRole('button', { name: 'Borrar' }))
    const mensaje = screen.getByText('¿Borrar «Antiguo»? No se puede deshacer.')
    fetchSimulado.mockResolvedValueOnce(respuesta(204))
    await userEvent.click(within(mensaje.closest('dialog')!).getByRole('button', { name: 'Borrar' }))
    await vi.waitFor(() => expect(screen.queryByText('Antiguo')).not.toBeInTheDocument())
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
      .mockResolvedValueOnce(respuesta(412, { mensaje: 'Versión distinta', version: 2 }))
      .mockResolvedValueOnce(respuesta(200, [{ ...RECIENTE, nombre: 'Cambiado', version: 2 }]))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Cambiado')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('ha cambiado en otro sitio')
    expect(fetchSimulado.mock.calls[1]![0].headers.get('If-Match')).toBe('"1"')
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

  it('sin sesión navega a /entrar?volver=/disenos', async () => {
    montar()
    expect(await screen.findByText('entrar')).toBeInTheDocument()
    expect(fetchSimulado).not.toHaveBeenCalled()
  })
})
