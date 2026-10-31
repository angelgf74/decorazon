// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { respuesta } from '../../pruebas/respuesta'
import OlvidoContrasena from './OlvidoContrasena'

const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()

async function enviar(correo: string) {
  render(<MemoryRouter><OlvidoContrasena /></MemoryRouter>)
  await userEvent.type(screen.getByLabelText('Correo'), correo)
  await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))
}

beforeEach(() => {
  fetchSimulado.mockReset()
  vi.stubGlobal('fetch', fetchSimulado)
})
afterEach(() => vi.unstubAllGlobals())

describe('OlvidoContrasena', () => {
  it('envía el correo y muestra el mensaje de la API', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(200, { mensaje: 'Si existe una cuenta, te hemos enviado un enlace' }))
    await enviar('ana@x.es')
    expect(await screen.findByText('Si existe una cuenta, te hemos enviado un enlace')).toBeInTheDocument()
    expect(await fetchSimulado.mock.calls[0][0].json()).toEqual({ correo: 'ana@x.es' })
  })

  it('con error muestra el mensaje de la API', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(429, { mensaje: 'Demasiados intentos' }))
    await enviar('ana@x.es')
    expect(await screen.findByText('Demasiados intentos')).toBeInTheDocument()
  })
})
