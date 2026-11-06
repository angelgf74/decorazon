// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAVE_SESION, conectarSesionConApi, reiniciarSesion } from '../../cuenta/sesion'
import { CLAVE_ID_DE_SUBIDA, guardarDisenoLocal } from '../../editor/persistencia/local'
import { almacen, reiniciarAlmacen } from '../../editor/estado/almacen'
import { catalogoBase, documentoNuevo, elementoNuevo, type DocumentoDiseno } from '../../nucleo'
import { respuesta } from '../../pruebas/respuesta'
import { textos } from '../../textos'
import VistaCompartida from './VistaCompartida'

// La 3D de verdad necesita WebGL: aquí se simula que lo hay y se sustituye por un marcador.
vi.mock('../../editor/comunes/webgl', () => ({ hayWebgl: () => true }))
vi.mock('../../editor/vista3d/Vista3DSoloVer', () => ({ default: () => <p>vista 3d</p> }))

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

  it('el plano se dibuja al ancho de la pantalla, para que sus textos no encojan', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 358, bottom: 300, width: 358, height: 300, toJSON: () => ({}) })
    fetchSimulado.mockResolvedValueOnce(respuesta(200, compartido()))
    montar()
    await vi.waitFor(() => expect(screen.getByRole('img', { name: 'Plano' }).getAttribute('viewBox')).toMatch(/^0 0 358 /))
    vi.restoreAllMocks()
  })

  it('«Ampliar plano» lo abre a pantalla completa y, al cerrarlo, el foco vuelve al botón', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(200, compartido()))
    montar()
    const ampliar = await screen.findByRole('button', { name: 'Ampliar plano' })
    await userEvent.click(ampliar)
    const dialogo = screen.getByRole('dialog', { name: 'Plano' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog', { name: 'Plano' })).toBeNull()
    expect(document.activeElement).toBe(ampliar)
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
    let enviado = ''
    fetchSimulado.mockImplementationOnce(async (peticion) => {
      const cuerpo = await peticion.json() as { id: string; nombre: string }
      enviado = cuerpo.nombre
      return respuesta(201, { id: cuerpo.id, nombre: cuerpo.nombre, tipoEstancia: 'bano', fechaDeCreacion: 'x', fechaDeModificacion: 'x', version: 1, contenido: doc, enlace: null })
    })
    await userEvent.click(screen.getByRole('button', { name: 'Hacer una copia' }))
    expect(await screen.findByText('editor de la cuenta')).toBeInTheDocument()
    const alta = fetchSimulado.mock.calls[1]![0]
    expect(alta.method).toBe('POST')
    expect(new URL(alta.url).pathname).toBe('/disenos')
    expect(enviado).toBe('Baño de arriba (copia)')
  })

  it('con sesión, reintentar la copia tras un fallo manda el mismo id: no crea dos', async () => {
    conSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, compartido()))
    montar()
    await screen.findByRole('heading', { level: 1, name: 'Baño de arriba' })
    fetchSimulado.mockResolvedValueOnce(respuesta(500, { mensaje: 'Algo ha fallado.' }))
    await userEvent.click(screen.getByRole('button', { name: 'Hacer una copia' }))
    await screen.findByRole('alert')
    fetchSimulado.mockResolvedValueOnce(respuesta(500, { mensaje: 'Algo ha fallado.' }))
    await userEvent.click(screen.getByRole('button', { name: 'Hacer una copia' }))
    await vi.waitFor(() => expect(fetchSimulado).toHaveBeenCalledTimes(3))
    const ids = await Promise.all(fetchSimulado.mock.calls.slice(1).map(async ([p]) => (await p.clone().json() as { id: string }).id))
    expect(ids[0]).toBe(ids[1])
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

  it('sin sesión, la copia olvida una subida a medias del diseño anterior, para que no lo pise en la cuenta al entrar', async () => {
    localStorage.setItem(CLAVE_ID_DE_SUBIDA, 'subida-vieja')
    fetchSimulado.mockResolvedValueOnce(respuesta(200, compartido()))
    montar()
    await screen.findByRole('heading', { level: 1, name: 'Baño de arriba' })
    await userEvent.click(screen.getByRole('button', { name: 'Hacer una copia' }))
    expect(await screen.findByText('editor anónimo')).toBeInTheDocument()
    expect(localStorage.getItem(CLAVE_ID_DE_SUBIDA)).toBeNull()
  })

  it('sin sesión y con el editor en un diseño de la cuenta, pregunta si hay un diseño guardado en el navegador', async () => {
    const mio = documentoNuevo('salon', 400, 300, 250)
    mio.elementos = [elementoNuevo(catalogoBase.get('sofa')!, { x: 200, y: 100 }, 'sofa')]
    guardarDisenoLocal(localStorage, mio)
    almacen.getState().abrirDelServidor('d1', 1, 'De la cuenta', documentoNuevo('cocina', 300, 300, 250))
    fetchSimulado.mockResolvedValueOnce(respuesta(200, compartido()))
    montar()
    await screen.findByRole('heading', { level: 1, name: 'Baño de arriba' })
    await userEvent.click(screen.getByRole('button', { name: 'Hacer una copia' }))
    expect(screen.getByText(/sustituirá el diseño que tienes en este navegador/)).toBeInTheDocument()
  })

  it('la 3D no se carga hasta pedirla', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(200, compartido()))
    montar()
    await screen.findByRole('heading', { level: 1, name: 'Baño de arriba' })
    expect(screen.queryByText('vista 3d')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Ver en 3D' }))
    expect(await screen.findByText('vista 3d')).toBeInTheDocument()
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

describe('VistaCompartida: muebles de tienda', () => {
  const conProducto = (url: string): DocumentoDiseno => {
    const doc = banoAmueblado()
    doc.elementos = doc.elementos.map((e) => ({ ...e, origen: { tipo: 'tienda', proveedor: 'Roca', nombre: 'Meridian', url } }))
    return doc
  }

  it('la lista enlaza la página del producto, en pestaña nueva', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(200, compartido(conProducto('https://www.roca.es/meridian'))))
    montar()
    const lista = await screen.findByRole('table')
    expect(within(lista).getByText('Meridian')).toBeInTheDocument()
    const enlace = within(lista).getByRole('link', { name: 'Ver en la tienda' })
    expect(enlace).toHaveAttribute('href', 'https://www.roca.es/meridian')
    expect(enlace).toHaveAttribute('rel', 'noopener noreferrer nofollow')
  })

  it('un diseño con un enlace javascript: no se pinta: el validador lo rechaza entero', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchSimulado.mockResolvedValueOnce(respuesta(200, compartido(conProducto('javascript:alert(document.cookie)'))))
    montar()
    expect(await screen.findByText(textos.compartir.noCarga)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'Baño de arriba' })).toBeNull()
    expect(document.querySelector('a[href^="javascript:"]')).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
  })
})


describe('VistaCompartida: imprimir', () => {
  it('«Imprimir» abre la hoja con el diseño compartido y su nombre; al cerrarla el foco vuelve al botón', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(200, compartido()))
    montar()
    await screen.findByRole('heading', { level: 1, name: 'Baño de arriba' })
    const boton = screen.getByRole('button', { name: textos.hoja.imprimir })
    await userEvent.click(boton)
    const hoja = await screen.findByRole('dialog', { name: textos.hoja.titulo })
    expect(within(hoja).getByRole('heading', { level: 1, name: 'Baño de arriba' })).toBeInTheDocument()
    expect(within(hoja).getByText('Inodoro')).toBeInTheDocument()
    // El almacén del editor no se toca: el diseño compartido no sustituye al del navegador.
    expect(almacen.getState().documento).toBeNull()
    await userEvent.click(within(hoja).getByRole('button', { name: textos.hoja.cerrar }))
    expect(screen.queryByRole('dialog', { name: textos.hoja.titulo })).toBeNull()
    expect(boton).toHaveFocus()
  })
})
