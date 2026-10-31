// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { respuesta } from '../../pruebas/respuesta'
import RestablecerContrasena from './RestablecerContrasena'

const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()
const CONTRASENA = 'una contraseña larga'

function PaginaEntrar() {
  const l = useLocation()
  return <p>entrar: {(l.state as { mensaje?: string } | null)?.mensaje}</p>
}

function montar() {
  render(
    <BrowserRouter>
      <Routes>
        <Route path="/contrasena/restablecer" element={<RestablecerContrasena />} />
        <Route path="/entrar" element={<PaginaEntrar />} />
      </Routes>
    </BrowserRouter>,
  )
}

async function escribir(contrasena: string, repetida: string) {
  await userEvent.type(screen.getByLabelText('Contraseña nueva'), contrasena)
  await userEvent.type(screen.getByLabelText('Repite la contraseña'), repetida)
  await userEvent.click(screen.getByRole('button', { name: 'Cambiar la contraseña' }))
}

beforeEach(() => {
  fetchSimulado.mockReset()
  vi.stubGlobal('fetch', fetchSimulado)
  window.history.replaceState(null, '', '/contrasena/restablecer?token=secreto123')
})
afterEach(() => vi.unstubAllGlobals())

describe('RestablecerContrasena', () => {
  it('el token desaparece de la URL tras montar', () => {
    montar()
    expect(window.location.pathname).toBe('/contrasena/restablecer')
    expect(window.location.search).toBe('')
    expect(window.location.href).not.toContain('secreto123')
  })

  it('contraseñas distintas no envían', async () => {
    montar()
    await escribir(CONTRASENA, CONTRASENA + 'x')
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument()
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  it('una contraseña corta no envía', async () => {
    montar()
    await escribir('corta', 'corta')
    expect(screen.getByText('La contraseña debe tener entre 12 y 128 caracteres')).toBeInTheDocument()
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  it('con éxito envía el token del enlace y va a Entrar con el mensaje de la API', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(200, { mensaje: 'Contraseña cambiada; ya puedes entrar' }))
    montar()
    await escribir(CONTRASENA, CONTRASENA)
    expect(await screen.findByText('entrar: Contraseña cambiada; ya puedes entrar')).toBeInTheDocument()
    const p = fetchSimulado.mock.calls[0][0]
    expect(p.url).not.toContain('secreto123')
    expect(p.url).not.toContain('larga')
    expect(await p.json()).toEqual({ token: 'secreto123', contrasena: CONTRASENA })
  })

  it('un 400 de la API muestra el mensaje y "Pedir otro enlace"', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(400, { mensaje: 'El enlace ha caducado o ya se ha usado' }))
    montar()
    await escribir(CONTRASENA, CONTRASENA)
    expect(await screen.findByText('El enlace ha caducado o ya se ha usado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pedir otro enlace' })).toHaveAttribute('href', '/contrasena/olvido')
  })

  it('sin token avisa y ofrece pedir otro enlace', () => {
    window.history.replaceState(null, '', '/contrasena/restablecer')
    montar()
    expect(screen.getByText('Este enlace no es válido.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pedir otro enlace' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Contraseña nueva')).toBeNull()
  })
})
