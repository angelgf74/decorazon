// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { respuesta } from '../../pruebas/respuesta'
import { alCaducarLaSesion, CLAVE_SESION, conectarSesionConApi, reiniciarSesion, sesion } from '../sesion'
import Entrar from './Entrar'

const MANANA = new Date(Date.now() + 86_400_000).toISOString()
const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()

function montar(busqueda: string, estado?: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/entrar', search: busqueda, state: estado }]}>
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/disenos" element={<p>mis diseños</p>} />
        <Route path="/disenos/abc" element={<p>diseño abc</p>} />
        <Route path="*" element={<p>otra página</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function entrarConExito() {
  fetchSimulado
    .mockResolvedValueOnce(respuesta(200, { token: 'jwt', caducidad: MANANA }))
    .mockResolvedValueOnce(respuesta(200, { nombre: 'Ana', correo: 'ana@x.es' }))
  await userEvent.type(screen.getByLabelText('Correo'), 'ana@x.es')
  await userEvent.type(screen.getByLabelText('Contraseña'), 'una contraseña larga')
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

beforeEach(() => {
  localStorage.clear()
  fetchSimulado.mockReset()
  vi.stubGlobal('fetch', fetchSimulado)
  reiniciarSesion()
  conectarSesionConApi()
})
afterEach(() => vi.unstubAllGlobals())

describe('Entrar', () => {
  it('con credenciales malas muestra el mensaje de la API', async () => {
    montar('')
    fetchSimulado.mockResolvedValueOnce(respuesta(401, { mensaje: 'Correo o contraseña incorrectos' }))
    await userEvent.type(screen.getByLabelText('Correo'), 'ana@x.es')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'mala')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Correo o contraseña incorrectos')).toBeInTheDocument()
  })

  it('sin volver va a /disenos', async () => {
    montar('')
    await entrarConExito()
    expect(await screen.findByText('mis diseños')).toBeInTheDocument()
  })

  it('con ?volver=/disenos/abc navega allí al entrar', async () => {
    montar('?volver=%2Fdisenos%2Fabc')
    await entrarConExito()
    expect(await screen.findByText('diseño abc')).toBeInTheDocument()
  })

  it.each(['//evil.com', '/\\evil.com', '/\t/evil.com', 'https://evil.com', 'disenos'])('?volver=%s se ignora', async (volver) => {
    montar(`?volver=${encodeURIComponent(volver)}`)
    await entrarConExito()
    expect(await screen.findByText('mis diseños')).toBeInTheDocument()
  })

  it('con ?motivo=caducada avisa de que la sesión ha caducado', () => {
    montar('?motivo=caducada')
    expect(screen.getByText('Tu sesión ha caducado. Vuelve a entrar.')).toBeInTheDocument()
  })

  it('muestra el mensaje que trae de otra página', () => {
    montar('', { mensaje: 'Contraseña cambiada' })
    expect(screen.getByText('Contraseña cambiada')).toBeInTheDocument()
  })

  it('enlaza a la contraseña olvidada y a crear cuenta', () => {
    montar('')
    expect(screen.getByRole('link', { name: '¿Has olvidado la contraseña?' })).toHaveAttribute('href', '/contrasena/olvido')
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/registro')
  })

  it('con una sesión válida previa, unas credenciales malas no cierran por caducidad ni navegan', async () => {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'previo', caducidad: MANANA }))
    reiniciarSesion()
    const alCaducar = vi.fn()
    alCaducarLaSesion(alCaducar)
    montar('?volver=%2Fdisenos%2Fabc')
    fetchSimulado.mockResolvedValueOnce(respuesta(401, { mensaje: 'Correo o contraseña incorrectos' }))
    await userEvent.type(screen.getByLabelText('Correo'), 'ana@x.es')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'mala')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Correo o contraseña incorrectos')).toBeInTheDocument()
    expect(fetchSimulado.mock.calls[0][0].headers.has('Authorization')).toBe(false)
    expect(alCaducar).not.toHaveBeenCalled()
    expect(screen.queryByText('diseño abc')).toBeNull()
    expect(sesion.getState().token).toBeNull()
  })
})
