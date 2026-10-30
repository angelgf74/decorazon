// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorDeApi } from '../../api/cliente'
import { CLAVE_SESION, reiniciarSesion } from '../../cuenta/sesion'
import { almacen, reiniciarAlmacen } from '../../editor/estado/almacen'
import { guardarCopiaLocal, guardarDisenoLocal, leerCopiaLocal } from '../../editor/persistencia/local'
import { conectarSincronizacion } from '../../editor/persistencia/sincronizacion'
import { documentoNuevo } from '../../nucleo'
import EditorDeDiseno from './EditorDeDiseno'

const servidor = vi.hoisted(() => ({ obtenerDiseno: vi.fn(), guardarDiseno: vi.fn() }))
vi.mock('../servidor', () => servidor)

const ID = 'd1'
const remoto = documentoNuevo('cocina', 400, 300, 250)
const local = documentoNuevo('cocina', 500, 300, 250)

function respuestaRemota(version: number) {
  return {
    diseno: {
      id: ID, nombre: 'Cocina', tipoEstancia: 'cocina', fechaDeCreacion: '', fechaDeModificacion: '', version, contenido: remoto,
    },
    version,
  }
}

function montar() {
  return render(
    <MemoryRouter initialEntries={[`/disenos/${ID}`]}>
      <Routes>
        <Route path="/disenos/:id" element={<EditorDeDiseno />} />
        <Route path="/entrar" element={<p>entrar</p>} />
        <Route path="/disenos" element={<p>mis diseños</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function conSesion() {
  localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: new Date(Date.now() + 86_400_000).toISOString() }))
  reiniciarSesion()
}

const ancho = () => almacen.getState().documento?.estancia.planta[1]!.x

beforeEach(() => {
  localStorage.clear()
  reiniciarSesion()
  reiniciarAlmacen()
  servidor.obtenerDiseno.mockReset()
  servidor.guardarDiseno.mockReset()
})
afterEach(() => vi.useRealTimers())

describe('EditorDeDiseno', () => {
  it('sin sesión lleva a entrar', () => {
    montar()
    expect(screen.getByText('entrar')).toBeInTheDocument()
  })

  it('abre la versión del servidor', async () => {
    conSesion()
    servidor.obtenerDiseno.mockResolvedValueOnce(respuestaRemota(4))
    montar()
    expect(await screen.findByRole('textbox', { name: 'Nombre del diseño' })).toHaveValue('Cocina')
    expect(almacen.getState().origen).toEqual({ tipo: 'servidor', id: ID, version: 4, nombre: 'Cocina' })
    expect(ancho()).toBe(400)
  })

  it('con una copia pendiente de la misma versión abre la local, pendiente', async () => {
    conSesion()
    guardarCopiaLocal(localStorage, ID, { version: 4, documento: local, pendiente: true })
    servidor.obtenerDiseno.mockResolvedValueOnce(respuestaRemota(4))
    montar()
    await screen.findByRole('textbox', { name: 'Nombre del diseño' })
    expect(ancho()).toBe(500)
    expect(almacen.getState().guardado).toBe('pendiente')
  })

  it('con una copia pendiente más antigua que el servidor abre la local y avisa del conflicto', async () => {
    conSesion()
    guardarCopiaLocal(localStorage, ID, { version: 4, documento: local, pendiente: true })
    servidor.obtenerDiseno.mockResolvedValueOnce(respuestaRemota(6))
    montar()
    expect(await screen.findByText('Este diseño se ha guardado desde otro sitio después de que lo abrieras.')).toBeInTheDocument()
    expect(ancho()).toBe(500)
    expect(almacen.getState().versionRemota).toBe(6)
  })

  it('sin conexión abre la copia local', async () => {
    conSesion()
    guardarCopiaLocal(localStorage, ID, { version: 4, nombre: 'Mi cocina', documento: local, pendiente: true })
    servidor.obtenerDiseno.mockRejectedValueOnce(new ErrorDeApi(0, 'No hay conexión'))
    montar()
    expect(await screen.findByRole('textbox', { name: 'Nombre del diseño' })).toHaveValue('Mi cocina')
    expect(almacen.getState().guardado).toBe('sinConexion')
    expect(screen.getByRole('status')).toHaveTextContent('Sin conexión')
  })

  it('sin conexión y sin copia: avisa y ofrece volver', async () => {
    conSesion()
    servidor.obtenerDiseno.mockRejectedValueOnce(new ErrorDeApi(0, 'No hay conexión'))
    montar()
    expect(await screen.findByRole('alert')).toHaveTextContent('No hay conexión')
    expect(screen.getByRole('link', { name: 'Volver a Mis diseños' })).toHaveAttribute('href', '/disenos')
  })

  it('con la sincronización conectada: abrir, editar y a los 2 s se guarda', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const desconectar = conectarSincronizacion(almacen, { esperaMs: 2000, st: localStorage })
    try {
      conSesion()
      servidor.obtenerDiseno.mockResolvedValueOnce(respuestaRemota(4))
      servidor.guardarDiseno.mockImplementation(async (_id: string, _v: number, c: { doc: typeof remoto }) => ({
        ...respuestaRemota(5).diseno, contenido: c.doc,
      }))
      montar()
      await screen.findByRole('textbox', { name: 'Nombre del diseño' })
      expect(screen.getByRole('status')).toHaveTextContent('Guardado')
      act(() => almacen.getState().cambiar((d) => ({ ...d, estancia: { ...d.estancia, alto: 270 } })))
      expect(almacen.getState().guardado).toBe('pendiente')
      // Con mucha carga, React puede pintar el cambio del almacén un poco después del act.
      expect(await screen.findByText('Guardando…')).toHaveAttribute('role', 'status')
      expect(leerCopiaLocal(localStorage, ID)).toMatchObject({ version: 4, pendiente: true })
      await act(() => vi.advanceTimersByTimeAsync(2000))
      expect(servidor.guardarDiseno).toHaveBeenCalledTimes(1)
      const [id, version, cambios] = servidor.guardarDiseno.mock.calls[0]!
      expect([id, version, cambios.doc.estancia.alto]).toEqual([ID, 4, 270])
      expect(almacen.getState().guardado).toBe('guardado')
      expect(await screen.findByText(/^Guardado$/)).toHaveAttribute('role', 'status')
      expect(almacen.getState().origen).toMatchObject({ version: 5 })
      expect(leerCopiaLocal(localStorage, ID)).toMatchObject({ version: 5, pendiente: false })
    } finally {
      desconectar()
    }
  })

  it('al salir vuelve al diseño anónimo', async () => {
    conSesion()
    const anonimo = documentoNuevo('salon', 300, 300, 250)
    guardarDisenoLocal(localStorage, anonimo)
    servidor.obtenerDiseno.mockResolvedValueOnce(respuestaRemota(4))
    const { unmount } = montar()
    await screen.findByRole('textbox', { name: 'Nombre del diseño' })
    unmount()
    expect(almacen.getState().origen.tipo).toBe('anonimo')
    expect(almacen.getState().documento).toEqual(anonimo)
  })
})
