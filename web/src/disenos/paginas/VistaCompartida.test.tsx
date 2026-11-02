// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAVE_SESION, conectarSesionConApi, reiniciarSesion } from '../../cuenta/sesion'
import { almacen, reiniciarAlmacen } from '../../editor/estado/almacen'
import { catalogoBase, documentoNuevo, elementoNuevo, type DocumentoDiseno } from '../../nucleo'
import { respuesta } from '../../pruebas/respuesta'
import VistaCompartida from './VistaCompartida'

const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()

function banoAmueblado(): DocumentoDiseno {
  const doc = documentoNuevo('bano', 250, 200, 250)
  doc.elementos = [elementoNuevo(catalogoBase.get('inodoro')!, { x: 100, y: 33 }, 'i')]
  return doc
}

function compartido(doc = banoAmueblado()) {
  return { nombre: 'Baño de arriba', tipoEstancia: 'bano', fechaDeModificacion: '2026-11-02T10:00:00Z', contenido: doc }
}

function montar(enlace = 'tok_1') {
  render(
    <MemoryRouter initialEntries={[`/compartido/${enlace}`]}>
      <Routes>
        <Route path="/compartido/:enlace" element={<VistaCompartida />} />
        <Route path="/disenos/:id" element={<p>editor de la cuenta</p>} />
        <Route path="/disenar" element={<p>editor anónimo</p>} />
        <Route path="/" element={<p>inicio</p>} />
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
  reiniciarAlmacen()
})
afterEach(() => vi.unstubAllGlobals())

describe('VistaCompartida', () => {
  it('enseña el nombre, el plano con los muebles y su lista, sin poder editar', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(200, compartido()))
    montar()
    expect(await screen.findByRole('heading', { level: 1, name: 'Baño de arriba' })).toBeInTheDocument()
    expect(screen.getByText(/Baño · 250 × 200 cm/)).toBeInTheDocument()
    const plano = screen.getByRole('img', { name: 'Plano' })
    expect(plano.querySelector('[data-elemento="i"]')).not.toBeNull()
    const lista = screen.getByRole('table')
    expect(within(lista).getByText('Inodoro')).toBeInTheDocument()
    expect(new URL(fetchSimulado.mock.calls[0]![0].url).pathname).toBe('/compartidos/tok_1')
    expect(screen.queryByRole('button', { name: 'Borrar' })).toBeNull()
  })

  it('un enlace que ya no funciona lo dice y ofrece volver al inicio', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(404, { mensaje: 'Este enlace ya no funciona.' }))
    montar('retirado')
    expect(await screen.findByRole('heading', { name: 'Este enlace ya no funciona' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/')
  })

  it('con sesión, «Hacer una copia» la crea en la cuenta con «(copia)» y abre el editor', async () => {
    conSesion()
    const doc = banoAmueblado()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, compartido(doc)))
    montar()
    await screen.findByRole('heading', { level: 1, name: 'Baño de arriba' })
    fetchSimulado.mockImplementationOnce(async (peticion) => {
      const cuerpo = await peticion.json() as { id: string; nombre: string }
      return respuesta(201, { id: cuerpo.id, nombre: cuerpo.nombre, tipoEstancia: 'bano', fechaDeCreacion: 'x', fechaDeModificacion: 'x', version: 1, contenido: doc, enlace: null })
    })
    await userEvent.click(screen.getByRole('button', { name: 'Hacer una copia' }))
    expect(await screen.findByText('editor de la cuenta')).toBeInTheDocument()
    const alta = fetchSimulado.mock.calls[1]![0]
    expect(alta.method).toBe('POST')
    expect(new URL(alta.url).pathname).toBe('/disenos')
  })

  it('con sesión y 100 diseños, «Hacer una copia» avisa del límite y se queda', async () => {
    conSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, compartido()))
    montar()
    await screen.findByRole('heading', { level: 1, name: 'Baño de arriba' })
    fetchSimulado.mockResolvedValueOnce(respuesta(409, { mensaje: 'Ya tienes 100 diseños, el máximo.' }))
    await userEvent.click(screen.getByRole('button', { name: 'Hacer una copia' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya tienes 100 diseños, el máximo.')
  })

  it('sin sesión y sin diseño en el navegador, la copia se abre como diseño del navegador', async () => {
    const doc = banoAmueblado()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, compartido(doc)))
    montar()
    await screen.findByRole('heading', { level: 1, name: 'Baño de arriba' })
    await userEvent.click(screen.getByRole('button', { name: 'Hacer una copia' }))
    expect(await screen.findByText('editor anónimo')).toBeInTheDocument()
    expect(almacen.getState().documento?.elementos.map((e) => e.id)).toEqual(['i'])
    expect(almacen.getState().origen.tipo).toBe('anonimo')
  })

  it('sin sesión y con otro diseño en el navegador, pregunta antes de sustituirlo', async () => {
    const mio = documentoNuevo('salon', 400, 300, 250)
    mio.elementos = [elementoNuevo(catalogoBase.get('sofa')!, { x: 200, y: 100 }, 'sofa')]
    almacen.getState().cargar(mio)
    fetchSimulado.mockResolvedValueOnce(respuesta(200, compartido()))
    montar()
    await screen.findByRole('heading', { level: 1, name: 'Baño de arriba' })
    await userEvent.click(screen.getByRole('button', { name: 'Hacer una copia' }))
    const pregunta = screen.getByText(/sustituirá el diseño que tienes en este navegador/)
    await userEvent.click(within(pregunta.closest('dialog')!).getByRole('button', { name: 'Cancelar' }))
    expect(almacen.getState().documento?.elementos.map((e) => e.id)).toEqual(['sofa'])
    await userEvent.click(screen.getByRole('button', { name: 'Hacer una copia' }))
    await userEvent.click(within(screen.getByText(/sustituirá/).closest('dialog')!).getByRole('button', { name: 'Sustituir' }))
    expect(await screen.findByText('editor anónimo')).toBeInTheDocument()
    expect(almacen.getState().documento?.elementos.map((e) => e.id)).toEqual(['i'])
  })
})
