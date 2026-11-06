// @vitest-environment jsdom
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { catalogoBase, elementoNuevo } from '../nucleo'
import { textos } from '../textos'
import { almacen, reiniciarAlmacen } from './estado/almacen'
import { conflictosDe } from './estado/conflictos'
import * as descargas from './comunes/descargar'
import Editor from './Editor'

const carga = vi.hoisted(() => ({ fallosPendientes: 0 }))
const webgl = vi.hoisted(() => ({ hay: false }))
vi.mock('./comunes/webgl', () => ({ hayWebgl: () => webgl.hay }))
// La captura 3D de verdad necesita WebGL: aquí es un marcador que nunca captura.
vi.mock('./vista3d/Captura3D', () => ({ default: () => <p>captura 3d</p> }))
const precarga = vi.hoisted(() => ({ cancelar: vi.fn(), precargar: vi.fn() }))

vi.mock('./vista3d/precargar', () => ({ precargarVista3D: precarga.precargar }))

// Sin red o con un fragmento de un despliegue anterior, el import dinámico rechaza.
vi.mock('./vista3d/Vista3D', () => {
  if (carga.fallosPendientes > 0) {
    carga.fallosPendientes--
    throw new Error('Failed to fetch dynamically imported module')
  }
  return { default: () => <p>Vista 3D cargada</p> }
})

const SIN_CARGA = 'No se pudo cargar la vista 3D. El plano 2D sigue funcionando.'

beforeEach(() => {
  reiniciarAlmacen()
  almacen.getState().crear('salon', 400, 330, 250)
  almacen.getState().cambiarVista('3d')
  carga.fallosPendientes = 1
  precarga.cancelar.mockReset()
  precarga.precargar.mockReset().mockReturnValue(precarga.cancelar)
})

describe('Editor: precarga del 3D', () => {
  it('al abrirse programa la precarga una vez y la cancela al salir', () => {
    almacen.getState().cambiarVista('2d')
    const { unmount } = render(<Editor />, { wrapper: MemoryRouter })
    expect(precarga.precargar).toHaveBeenCalledTimes(1)
    expect(precarga.cancelar).not.toHaveBeenCalled()
    unmount()
    expect(precarga.cancelar).toHaveBeenCalledTimes(1)
  })

  it('con el módulo ya precargado, pulsar 3D lo enseña al momento, sin pasar por la carga', async () => {
    almacen.getState().cambiarVista('2d')
    render(<Editor />, { wrapper: MemoryRouter })
    const { alCargar } = precarga.precargar.mock.calls[0][0] as { alCargar: (m: { default: () => React.ReactNode }) => void }
    act(() => alCargar({ default: () => <p>Vista 3D precargada</p> }))
    await userEvent.click(screen.getByRole('button', { name: /^3D$/ }))
    expect(screen.getByText('Vista 3D precargada')).toBeInTheDocument()
    expect(screen.queryByText(textos.vista3d.cargando)).toBeNull()
  })
})

describe('Editor: selector de vista sobre el plano', () => {
  it('2D va pulsado por defecto y 3D cambia la vista; el selector sigue ahí en 3D', async () => {
    almacen.getState().cambiarVista('2d')
    render(<Editor />, { wrapper: MemoryRouter })
    const vista = screen.getByRole('group', { name: textos.barra.vista })
    expect(within(vista).getByRole('button', { name: '2D' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(within(vista).getByRole('button', { name: '3D' }))
    expect(almacen.getState().vista).toBe('3d')
    expect(within(vista).getByRole('button', { name: '3D' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('group', { name: textos.barra.vista })).toBeInTheDocument()
  })
})

describe('Editor: fragmento 3D', () => {
  it('si no se puede cargar, avisa y "Volver al 2D" vuelve al plano', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Editor />, { wrapper: MemoryRouter })
    expect(await screen.findByText(SIN_CARGA)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Volver al 2D' }))
    expect(almacen.getState().vista).toBe('2d')
  })

  it('tras un fallo, volver a pulsar 3D reintenta la carga', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Editor />, { wrapper: MemoryRouter })
    expect(await screen.findByText(SIN_CARGA)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Volver al 2D' }))
    act(() => almacen.getState().cambiarVista('3d'))
    expect(await screen.findByText('Vista 3D cargada')).toBeInTheDocument()
    expect(screen.queryByText(SIN_CARGA)).toBeNull()
  })
})

// jsdom no evalúa media queries: la regla de escritorio oculta las pestañas (display: none) y entonces
// getByRole no calcula su nombre. Se buscan por su clase y su texto.
const pestanas = () => document.querySelector<HTMLElement>('nav.editor__pestanas')!

describe('Editor: pestañas de las hojas (móvil)', () => {
  beforeEach(() => almacen.getState().cambiarVista('2d'))

  it('abren y cierran la hoja de la estancia', async () => {
    render(<Editor />, { wrapper: MemoryRouter })
    expect(pestanas()).toHaveAttribute('aria-label', textos.barra.paneles)
    const estancia = within(pestanas()).getByText(textos.barra.estancia).closest('button')!
    await userEvent.click(estancia)
    expect(estancia).toHaveAttribute('aria-expanded', 'true')
    expect(document.querySelector('.editor__izquierda')).toHaveClass('hoja--abierta')
    await userEvent.click(estancia)
    expect(estancia).toHaveAttribute('aria-expanded', 'false')
  })

  it('"Propiedades" ya no lleva insignia: los avisos están sobre el plano', () => {
    const def = catalogoBase.get('armario')
    if (!def) throw new Error('armario')
    almacen.getState().cambiar((d) => ({ ...d, elementos: [elementoNuevo(def, { x: 1000, y: 100 }, 'a')] }))
    const n = conflictosDe(almacen.getState().documento!).length
    expect(n).toBeGreaterThan(0)
    render(<Editor />, { wrapper: MemoryRouter })
    const propiedades = within(pestanas()).getByText(textos.barra.propiedades).closest('button')!
    expect(within(propiedades).queryByText(String(n))).toBeNull()
    const lienzo = document.querySelector<HTMLElement>('.editor__lienzo')!
    expect(within(lienzo).getByRole('button', { name: textos.barra.avisos(n) })).toBeInTheDocument()
  })
})

describe('Editor: panel derecho contextual', () => {
  beforeEach(() => almacen.getState().cambiarVista('2d'))

  it('sin selección el panel se oculta y el cuerpo lo sabe; con una pared seleccionada aparece', () => {
    render(<Editor />, { wrapper: MemoryRouter })
    expect(document.querySelector('.editor__cuerpo')).toHaveClass('editor__cuerpo--sin-panel')
    expect(document.querySelector('.editor__derecha')).toHaveClass('editor__derecha--oculta')
    act(() => almacen.getState().seleccionar({ tipo: 'pared', indice: 0 }))
    expect(document.querySelector('.editor__cuerpo')).not.toHaveClass('editor__cuerpo--sin-panel')
    expect(document.querySelector('.editor__derecha')).not.toHaveClass('editor__derecha--oculta')
    expect(screen.getByRole('heading', { name: 'Pared 1' })).toBeInTheDocument()
  })

  it('una selección que no es de este paso tampoco abre el panel', () => {
    const def = catalogoBase.get('armario')
    if (!def) throw new Error('armario')
    almacen.getState().cambiar((d) => ({ ...d, elementos: [elementoNuevo(def, { x: 100, y: 100 }, 'a')] }))
    almacen.getState().irAPaso(2)
    almacen.getState().seleccionar({ tipo: 'elemento', id: 'a' })
    render(<Editor />, { wrapper: MemoryRouter })
    expect(document.querySelector('.editor__derecha')).not.toHaveClass('editor__derecha--oculta')
    // Al volver al paso 1 el almacén suelta la selección del mueble: sin nada que enseñar, se oculta.
    act(() => almacen.getState().irAPaso(1))
    expect(document.querySelector('.editor__derecha')).toHaveClass('editor__derecha--oculta')
  })

  it('el chip de avisos sigue sobre la vista 3D', () => {
    almacen.getState().cambiarVista('3d')
    render(<Editor />, { wrapper: MemoryRouter })
    const lienzo = document.querySelector<HTMLElement>('.editor__lienzo')!
    expect(within(lienzo).getByText(textos.avisos.todoBien)).toBeInTheDocument()
  })
})

describe('Editor: hoja para imprimir', () => {
  it('"Imprimir" (en el menú Más acciones) abre la hoja y "Cerrar" vuelve al editor con el foco en "Más acciones"', async () => {
    almacen.getState().cambiarVista('2d')
    render(<Editor />, { wrapper: MemoryRouter })
    const mas = screen.getByRole('button', { name: 'Más acciones' })
    await userEvent.click(mas)
    await userEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
    expect(screen.getByRole('dialog', { name: 'Hoja para imprimir' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog', { name: 'Hoja para imprimir' })).toBeNull()
    // El botón Imprimir ya no existe (el menú se cerró): el foco vuelve al que lo abrió.
    expect(mas).toHaveFocus()
  })

  it('con la hoja abierta, los atajos del editor no tocan el diseño de detrás', async () => {
    almacen.getState().cambiarVista('2d')
    almacen.getState().irAPaso(2)
    almacen.getState().cambiar((d) => ({ ...d, elementos: [elementoNuevo(catalogoBase.get('cama')!, { x: 200, y: 165 }, 'c')] }))
    almacen.getState().seleccionar({ tipo: 'elemento', id: 'c' })
    render(<Editor />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    await userEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
    await userEvent.keyboard('{Delete}')
    expect(almacen.getState().documento!.elementos).toHaveLength(1)
    // Deshacer tampoco: quitaría la cama recién añadida.
    await userEvent.keyboard('{Control>}z{/Control}')
    expect(almacen.getState().documento!.elementos).toHaveLength(1)
  })
})

describe('Editor: descargas del menú', () => {
  it('"Descargar diseño" descarga «Mi diseño.decorazon.json» con el diseño del editor', async () => {
    almacen.getState().cambiarVista('2d')
    const descargar = vi.spyOn(descargas, 'descargar').mockImplementation(() => {})
    render(<Editor />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    await userEvent.click(screen.getByRole('button', { name: textos.barra.descargarDiseno }))
    expect(descargar).toHaveBeenCalledOnce()
    const [nombre, blob] = descargar.mock.calls[0]!
    expect(nombre).toBe('Mi diseño.decorazon.json')
    expect(JSON.parse(await (blob as Blob).text())).toEqual(almacen.getState().documento)
    descargar.mockRestore()
  })

  it('"Descargar plano" descarga «Mi diseño - plano.svg» (sin canvas, el svg)', async () => {
    almacen.getState().cambiarVista('2d')
    const descargar = vi.spyOn(descargas, 'descargar').mockImplementation(() => {})
    render(<Editor />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    await userEvent.click(screen.getByRole('button', { name: textos.barra.descargarPlano }))
    await vi.waitFor(() => expect(descargar).toHaveBeenCalledOnce())
    expect(descargar.mock.calls[0]![0]).toBe('Mi diseño - plano.svg')
    descargar.mockRestore()
  })

  it('"Descargar imagen 3D" sin WebGL avisa y no descarga nada', async () => {
    almacen.getState().cambiarVista('2d')
    const descargar = vi.spyOn(descargas, 'descargar').mockImplementation(() => {})
    render(<Editor />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    await userEvent.click(screen.getByRole('button', { name: textos.barra.descargarImagen }))
    expect(await screen.findByText(textos.hoja.sin3d)).toBeInTheDocument()
    expect(descargar).not.toHaveBeenCalled()
    descargar.mockRestore()
  })
})

describe('Editor: la captura de la imagen 3D y «Nuevo diseño»', () => {
  it('empezar un diseño nuevo a mitad de la captura la anula: la estancia siguiente no descarga nada ni dice «Preparando…»', async () => {
    almacen.getState().cambiarVista('2d')
    webgl.hay = true
    const descargar = vi.spyOn(descargas, 'descargar').mockImplementation(() => {})
    render(<Editor />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    await userEvent.click(screen.getByRole('button', { name: textos.barra.descargarImagen }))
    expect(await screen.findByText('captura 3d')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    expect(screen.getByRole('button', { name: textos.barra.preparandoImagen })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: textos.barra.nuevoDiseno }))
    await userEvent.click(screen.getByRole('button', { name: textos.comun.aceptar }))
    expect(almacen.getState().documento).toBeNull()
    act(() => almacen.getState().crear('cocina', 300, 250, 250))
    expect(screen.queryByText('captura 3d')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    expect(screen.getByRole('button', { name: textos.barra.descargarImagen })).toBeEnabled()
    expect(descargar).not.toHaveBeenCalled()
    descargar.mockRestore()
    webgl.hay = false
  })
})

describe('Editor: guía del primer uso', () => {
  const t = textos.guia
  beforeEach(() => {
    localStorage.clear()
    reiniciarAlmacen()
  })

  it('se enseña al crear una estancia nueva sin la marca, oculta las pistas y, al saltarla, vuelven las pistas', async () => {
    render(<Editor />, { wrapper: MemoryRouter })
    expect(screen.queryByRole('region', { name: t.titulo })).toBeNull()
    act(() => almacen.getState().crear('dormitorio', 400, 330, 250))
    expect(screen.getByRole('region', { name: t.titulo })).toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: textos.lienzo.pistas.titulo })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: t.saltar }))
    expect(screen.queryByRole('region', { name: t.titulo })).toBeNull()
    expect(screen.getByRole('complementary', { name: textos.lienzo.pistas.titulo })).toBeInTheDocument()
    expect(localStorage.getItem('decorazon.guia')).toBe('vista')
  })

  it('con la marca puesta no se enseña', () => {
    localStorage.setItem('decorazon.guia', 'vista')
    render(<Editor />, { wrapper: MemoryRouter })
    act(() => almacen.getState().crear('dormitorio', 400, 330, 250))
    expect(screen.queryByRole('region', { name: t.titulo })).toBeNull()
  })

  it('no se enseña con un diseño que ya estaba abierto al entrar (una copia, un fichero, el de ayer) ni con uno del servidor', () => {
    almacen.getState().crear('salon', 400, 330, 250)
    render(<Editor />, { wrapper: MemoryRouter })
    expect(screen.queryByRole('region', { name: t.titulo })).toBeNull()
    act(() => almacen.getState().abrirDelServidor('11111111-1111-1111-1111-111111111111', 1, 'Mío', almacen.getState().documento!))
    expect(screen.queryByRole('region', { name: t.titulo })).toBeNull()
  })
})
