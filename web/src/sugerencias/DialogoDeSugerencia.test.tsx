// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAVE_SESION, conectarSesionConApi, reiniciarSesion, sesion } from '../cuenta/sesion'
import { respuesta } from '../pruebas/respuesta'
import BotonDeSugerencia from './BotonDeSugerencia'

const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()
const MANANA = new Date(Date.now() + 86_400_000).toISOString()

function montar() {
  render(
    <MemoryRouter>
      <BotonDeSugerencia>Sugerencias</BotonDeSugerencia>
    </MemoryRouter>,
  )
}

async function abrir() {
  await userEvent.click(screen.getByRole('button', { name: 'Sugerencias' }))
  return screen.getByRole('dialog', { name: 'Envíanos una sugerencia' })
}

function entrar() {
  localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: MANANA }))
  reiniciarSesion()
  conectarSesionConApi()
  sesion.setState({ usuario: { nombre: 'Ana', correo: 'ana@x.es' } })
}

beforeEach(() => {
  localStorage.clear()
  fetchSimulado.mockReset()
  vi.stubGlobal('fetch', fetchSimulado)
  reiniciarSesion()
  conectarSesionConApi()
})
afterEach(() => vi.unstubAllGlobals())

describe('Sugerencias', () => {
  it('sin sesión pide el correo y lo manda con el texto y el tipo', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(204))
    montar()
    const dialogo = await abrir()

    await userEvent.selectOptions(within(dialogo).getByLabelText('De qué va'), 'Algo no funciona')
    await userEvent.type(within(dialogo).getByLabelText('Tu sugerencia'), 'El botón de girar no hace nada')
    await userEvent.type(within(dialogo).getByLabelText('Tu correo'), ' ana@x.es ')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Enviar' }))

    expect(await within(dialogo).findByText('Gracias. Hemos recibido tu sugerencia.')).toBeInTheDocument()
    const p = fetchSimulado.mock.calls[0][0]
    expect(p.method).toBe('POST')
    expect(new URL(p.url).pathname).toBe('/sugerencias')
    expect(p.headers.get('Authorization')).toBeNull()
    expect(await p.json()).toEqual({ texto: 'El botón de girar no hace nada', tipo: 'error', correo: 'ana@x.es' })
  })

  it('tras enviarla, el foco pasa a Cerrar y Cerrar quita el diálogo', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(204))
    montar()
    const dialogo = await abrir()
    await userEvent.type(within(dialogo).getByLabelText('Tu sugerencia'), 'Hola')
    await userEvent.type(within(dialogo).getByLabelText('Tu correo'), 'ana@x.es')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Enviar' }))

    const cerrar = await within(dialogo).findByRole('button', { name: 'Cerrar' })
    expect(document.activeElement).toBe(cerrar)
    await userEvent.click(cerrar)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('con sesión no pide correo: dice a cuál se responde y manda el token, sin correo en el cuerpo', async () => {
    entrar()
    fetchSimulado.mockResolvedValueOnce(respuesta(204))
    montar()
    const dialogo = await abrir()

    expect(within(dialogo).queryByLabelText('Tu correo')).not.toBeInTheDocument()
    expect(within(dialogo).getByText('Te responderemos a ana@x.es.')).toBeInTheDocument()
    await userEvent.type(within(dialogo).getByLabelText('Tu sugerencia'), 'Más muebles de baño')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Enviar' }))

    await within(dialogo).findByText('Gracias. Hemos recibido tu sugerencia.')
    const p = fetchSimulado.mock.calls[0][0]
    expect(p.headers.get('Authorization')).toBe('Bearer jwt')
    expect(await p.json()).toEqual({ texto: 'Más muebles de baño', tipo: 'mejora' })
  })

  it('sin texto avisa y no manda nada', async () => {
    montar()
    const dialogo = await abrir()
    await userEvent.type(within(dialogo).getByLabelText('Tu sugerencia'), '   ')
    await userEvent.type(within(dialogo).getByLabelText('Tu correo'), 'ana@x.es')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Enviar' }))

    expect(within(dialogo).getByRole('alert')).toHaveTextContent('Escribe tu sugerencia.')
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  it('sin sesión y sin correo avisa y no manda nada', async () => {
    montar()
    const dialogo = await abrir()
    await userEvent.type(within(dialogo).getByLabelText('Tu sugerencia'), 'Hola')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Enviar' }))

    expect(within(dialogo).getByRole('alert')).toHaveTextContent('Indica tu correo para poder responderte.')
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  it('si el buzón falla enseña el mensaje y conserva lo escrito para reintentar', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(502, { mensaje: 'No se ha podido enviar la sugerencia. Inténtalo dentro de un rato.' }))
    montar()
    const dialogo = await abrir()
    await userEvent.type(within(dialogo).getByLabelText('Tu sugerencia'), 'Hola')
    await userEvent.type(within(dialogo).getByLabelText('Tu correo'), 'ana@x.es')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Enviar' }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('No se ha podido enviar la sugerencia. Inténtalo dentro de un rato.')
    expect(within(dialogo).getByLabelText('Tu sugerencia')).toHaveValue('Hola')
    expect(within(dialogo).getByRole('button', { name: 'Enviar' })).toBeEnabled()
  })

  it('Cancelar cierra sin mandar nada', async () => {
    montar()
    const dialogo = await abrir()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  it('enlaza a Privacidad', async () => {
    montar()
    const dialogo = await abrir()

    expect(within(dialogo).getByRole('link', { name: 'Cómo tratamos lo que nos envías' })).toHaveAttribute('href', '/privacidad')
  })
})
