// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { respuesta } from '../pruebas/respuesta'
import { CLAVE_SESION, conectarSesionConApi, reiniciarSesion, sesion } from '../cuenta/sesion'
import Administracion from './Administracion'

const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()
const MANANA = new Date(Date.now() + 86_400_000).toISOString()

const LISTADO = {
  usuarios: [
    { id: '1', correo: 'ana@x.es', nombre: 'Ana', fechaDeAlta: '2026-10-01T10:00:00Z', disenos: 3, bytes: 2 * 1024 * 1024 },
    { id: '2', correo: 'luis@x.es', nombre: 'Luis', fechaDeAlta: '2026-11-02T10:00:00Z', disenos: 0, bytes: 0 },
  ],
  totalDeDisenos: 3,
  totalDeBytes: 2 * 1024 * 1024,
}

function Donde() {
  const l = useLocation()
  return <p>en {l.pathname}{l.search}</p>
}

function montar() {
  render(
    <MemoryRouter initialEntries={['/administracion']}>
      <Routes>
        <Route path="/administracion" element={<Administracion />} />
        <Route path="*" element={<Donde />} />
      </Routes>
    </MemoryRouter>,
  )
}

function conSesion(esAdministrador: boolean) {
  localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: MANANA }))
  reiniciarSesion()
  conectarSesionConApi()
  sesion.setState({ usuario: { nombre: 'Ana', correo: 'ana@x.es', esAdministrador } })
}

beforeEach(() => {
  localStorage.clear()
  fetchSimulado.mockReset()
  vi.stubGlobal('fetch', fetchSimulado)
  reiniciarSesion()
})
afterEach(() => vi.unstubAllGlobals())

describe('Administracion', () => {
  it('sin sesión lleva a Entrar y vuelve aquí después', () => {
    montar()
    expect(screen.getByText('en /entrar?volver=/administracion')).toBeTruthy()
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  it('con una cuenta que no administra lleva al inicio sin pedir nada', () => {
    conSesion(false)
    montar()
    expect(screen.getByText('en /')).toBeTruthy()
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  it('enseña una fila por cuenta con sus diseños, su espacio y el total', async () => {
    conSesion(true)
    fetchSimulado.mockResolvedValueOnce(respuesta(200, LISTADO))
    montar()

    const tabla = await screen.findByRole('table')
    const filas = within(tabla).getAllByRole('row')
    // Cabecera, dos cuentas y el total.
    expect(filas).toHaveLength(4)
    expect(within(filas[1]).getByText('ana@x.es')).toBeTruthy()
    expect(within(filas[1]).getByText('Ana')).toBeTruthy()
    expect(within(filas[1]).getByText('3')).toBeTruthy()
    expect(within(filas[1]).getByText('2,0 MB')).toBeTruthy()
    expect(within(filas[1]).getByText('1/10/2026')).toBeTruthy()
    expect(within(filas[2]).getByText('0 B')).toBeTruthy()
    expect(within(filas[3]).getByText('Total (2 cuentas)')).toBeTruthy()

    const peticion = fetchSimulado.mock.calls[0][0]
    expect(peticion.url).toMatch(/\/administracion\/usuarios$/)
    expect(peticion.headers.get('Authorization')).toBe('Bearer jwt')
  })

  it('si la API dice 403 (el correo salió de la configuración) lleva al inicio', async () => {
    conSesion(true)
    fetchSimulado.mockResolvedValueOnce(respuesta(403))
    montar()
    expect(await screen.findByText('en /')).toBeTruthy()
  })

  it('otro error se enseña como aviso', async () => {
    conSesion(true)
    fetchSimulado.mockResolvedValueOnce(respuesta(500, { mensaje: 'Algo ha fallado' }))
    montar()
    expect((await screen.findByRole('alert')).textContent).toBeTruthy()
  })
})
