// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { respuesta } from '../../pruebas/respuesta'
import ConfirmarRegistro from './ConfirmarRegistro'

const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()
const CONTRASENA = 'una contraseña larga'
const MENSAJE_CREADA = 'entrar: Cuenta creada. Ya puedes iniciar sesión. Si diseñaste algo antes de registrarte, lo encontrarás en Mis diseños.'

function PaginaEntrar() {
  const l = useLocation()
  return <p>entrar: {(l.state as { mensaje?: string } | null)?.mensaje}</p>
}

function montar() {
  render(
    <BrowserRouter>
      <Routes>
        <Route path="/registro/confirmar" element={<ConfirmarRegistro />} />
        <Route path="/entrar" element={<PaginaEntrar />} />
      </Routes>
    </BrowserRouter>,
  )
}

async function escribir(nombre: string, contrasena: string, repetida: string) {
  if (nombre) await userEvent.type(screen.getByLabelText('Nombre'), nombre)
  await userEvent.type(screen.getByLabelText('Contraseña'), contrasena)
  await userEvent.type(screen.getByLabelText('Repite la contraseña'), repetida)
  await userEvent.click(screen.getByRole('button', { name: 'Crear la cuenta' }))
}

beforeEach(() => {
  fetchSimulado.mockReset()
  vi.stubGlobal('fetch', fetchSimulado)
  localStorage.clear()
  window.history.replaceState(null, '', '/registro/confirmar?token=secreto123')
})
afterEach(() => vi.unstubAllGlobals())

describe('ConfirmarRegistro', () => {
  it('el token desaparece de la URL tras montar', () => {
    montar()
    expect(window.location.search).toBe('')
    expect(window.location.href).not.toContain('secreto123')
  })

  it('un nombre vacío no envía', async () => {
    montar()
    await escribir('   ', CONTRASENA, CONTRASENA)
    expect(screen.getByText('El nombre debe tener entre 1 y 100 caracteres')).toBeInTheDocument()
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  it('contraseñas distintas no envían', async () => {
    montar()
    await escribir('Ana', CONTRASENA, CONTRASENA + 'x')
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument()
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  it('una contraseña corta no envía', async () => {
    montar()
    await escribir('Ana', 'corta', 'corta')
    expect(screen.getByText('La contraseña debe tener entre 12 y 128 caracteres')).toBeInTheDocument()
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  it('un 400 muestra el mensaje y "Volver a registrarte"', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(400, { mensaje: 'El enlace ha caducado o ya se ha usado' }))
    montar()
    await escribir('Ana', CONTRASENA, CONTRASENA)
    expect(await screen.findByText('El enlace ha caducado o ya se ha usado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a registrarte' })).toHaveAttribute('href', '/registro')
  })

  it('un 200 envía token, nombre y contraseña en el cuerpo y va a /entrar', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(200, { mensaje: 'ok' }))
    montar()
    await escribir('  Ana  ', CONTRASENA, CONTRASENA)
    // sin ninguna clave local, como al abrir el enlace en otro dispositivo
    expect(await screen.findByText(MENSAJE_CREADA)).toBeInTheDocument()
    const p = fetchSimulado.mock.calls[0][0]
    expect(p.url).not.toContain('secreto123')
    expect(await p.json()).toEqual({ token: 'secreto123', nombre: 'Ana', contrasena: CONTRASENA })
  })
})
