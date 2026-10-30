// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorDeApi } from '../../api/cliente'
import { CLAVE_SESION, reiniciarSesion } from '../../cuenta/sesion'
import { almacen, reiniciarAlmacen } from '../../editor/estado/almacen'
import { guardarCopiaLocal, guardarDisenoLocal } from '../../editor/persistencia/local'
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
})

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
