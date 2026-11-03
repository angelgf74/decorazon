// @vitest-environment jsdom
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { catalogoBase, elementoNuevo } from '../nucleo'
import { textos } from '../textos'
import { almacen, reiniciarAlmacen } from './estado/almacen'
import { conflictosDe } from './estado/conflictos'
import Editor from './Editor'

const carga = vi.hoisted(() => ({ fallosPendientes: 0 }))
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

  it('"Propiedades" dice cuántos avisos hay', () => {
    const def = catalogoBase.get('armario')
    if (!def) throw new Error('armario')
    almacen.getState().cambiar((d) => ({ ...d, elementos: [elementoNuevo(def, { x: 1000, y: 100 }, 'a')] }))
    const n = conflictosDe(almacen.getState().documento!).length
    expect(n).toBeGreaterThan(0)
    render(<Editor />, { wrapper: MemoryRouter })
    const propiedades = within(pestanas()).getByText(textos.barra.propiedades).closest('button')!
    expect(within(propiedades).getByText(String(n))).toHaveAttribute('aria-hidden', 'true')
    expect(within(propiedades).getByText(`, ${textos.barra.avisos(n)}`)).toHaveClass('solo-lectores')
  })
})

describe('Editor: hoja para imprimir', () => {
  it('"Imprimir" abre la hoja y "Cerrar" vuelve al editor con el foco en el botón', async () => {
    almacen.getState().cambiarVista('2d')
    render(<Editor />, { wrapper: MemoryRouter })
    const boton = screen.getByRole('button', { name: 'Imprimir' })
    await userEvent.click(boton)
    expect(screen.getByRole('dialog', { name: 'Hoja para imprimir' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog', { name: 'Hoja para imprimir' })).toBeNull()
    expect(boton).toHaveFocus()
  })

  it('con la hoja abierta, los atajos del editor no tocan el diseño de detrás', async () => {
    almacen.getState().cambiarVista('2d')
    almacen.getState().irAPaso(2)
    almacen.getState().cambiar((d) => ({ ...d, elementos: [elementoNuevo(catalogoBase.get('cama')!, { x: 200, y: 165 }, 'c')] }))
    almacen.getState().seleccionar({ tipo: 'elemento', id: 'c' })
    render(<Editor />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
    await userEvent.keyboard('{Delete}')
    expect(almacen.getState().documento!.elementos).toHaveLength(1)
    // Deshacer tampoco: quitaría la cama recién añadida.
    await userEvent.keyboard('{Control>}z{/Control}')
    expect(almacen.getState().documento!.elementos).toHaveLength(1)
  })
})
