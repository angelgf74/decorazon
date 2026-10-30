// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { almacen, reiniciarAlmacen } from '../../editor/estado/almacen'
import { CLAVE_REGISTRO_ENVIADO } from '../../editor/persistencia/local'
import { catalogoBase, elementoNuevo, serializarDocumento } from '../../nucleo'
import { respuesta } from '../../pruebas/respuesta'
import Registro from './Registro'

const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()

async function escribirYEnviar() {
  await userEvent.type(screen.getByLabelText('Correo'), 'ana@x.es')
  await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))
}

function conUnElemento() {
  almacen.getState().crear('salon', 400, 330, 250)
  const def = catalogoBase.get('armario')
  if (!def) throw new Error('armario')
  const el = elementoNuevo(def, { x: 1e-17, y: 50.123456 }, 'a')
  almacen.getState().cambiar((d) => ({ ...d, elementos: [el] }))
}

beforeEach(() => {
  fetchSimulado.mockReset()
  vi.stubGlobal('fetch', fetchSimulado)
  localStorage.clear()
  reiniciarAlmacen()
})
afterEach(() => vi.unstubAllGlobals())

describe('Registro', () => {
  it('con un diseño anónimo lo envía redondeado y lo explica', async () => {
    conUnElemento()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, { mensaje: 'Revisa tu correo' }))
    render(<MemoryRouter><Registro /></MemoryRouter>)
    expect(screen.getByText('Tu diseño actual se guardará en tu cuenta')).toBeInTheDocument()
    await escribirYEnviar()
    expect(await screen.findByText('Revisa tu correo')).toBeInTheDocument()
    const cuerpo = (await fetchSimulado.mock.calls[0][0].json()) as {
      correo: string
      diseno: { nombre: string; tipoEstancia: string; contenido: { elementos: { posicion: { x: number; y: number } }[] } }
    }
    expect(cuerpo.correo).toBe('ana@x.es')
    expect(cuerpo.diseno.nombre).toBe('Mi primer diseño')
    expect(cuerpo.diseno.tipoEstancia).toBe('salon')
    expect(cuerpo.diseno.contenido.elementos[0].posicion).toEqual({ x: 0, y: 50.12 })
    expect(localStorage.getItem(CLAVE_REGISTRO_ENVIADO)).toBe(serializarDocumento(almacen.getState().documento!))
  })

  it('sin diseño no lleva diseno ni guarda nada', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(200, { mensaje: 'Revisa tu correo' }))
    render(<MemoryRouter><Registro /></MemoryRouter>)
    await escribirYEnviar()
    expect(await screen.findByText('Revisa tu correo')).toBeInTheDocument()
    expect(screen.queryByText('Tu diseño actual se guardará en tu cuenta')).toBeNull()
    expect(await fetchSimulado.mock.calls[0][0].json()).toEqual({ correo: 'ana@x.es' })
    expect(localStorage.getItem(CLAVE_REGISTRO_ENVIADO)).toBeNull()
  })

  it('un registro sin diseño tras otro con diseño borra la clave', async () => {
    localStorage.setItem(CLAVE_REGISTRO_ENVIADO, '{"viejo":true}')
    fetchSimulado.mockResolvedValueOnce(respuesta(200, { mensaje: 'Revisa tu correo' }))
    render(<MemoryRouter><Registro /></MemoryRouter>)
    await escribirYEnviar()
    expect(await screen.findByText('Revisa tu correo')).toBeInTheDocument()
    expect(localStorage.getItem(CLAVE_REGISTRO_ENVIADO)).toBeNull()
  })

  it.each([429, 503, 400])('con un %i muestra el mensaje', async (estado) => {
    fetchSimulado.mockResolvedValueOnce(respuesta(estado, { mensaje: 'No ha podido ser' }))
    render(<MemoryRouter><Registro /></MemoryRouter>)
    await escribirYEnviar()
    expect(await screen.findByText('No ha podido ser')).toBeInTheDocument()
    expect(localStorage.getItem(CLAVE_REGISTRO_ENVIADO)).toBeNull()
  })
})
