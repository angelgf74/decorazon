// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { contienePunto } from '../../nucleo/geometria/poligono'
import { textos } from '../../textos'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import Lienzo from '../lienzo/Lienzo'
import PanelCatalogo from './PanelCatalogo'

beforeEach(() => {
  reiniciarAlmacen()
})

describe('PanelCatalogo', () => {
  it('en una cocina, el primer grupo es "Para tu cocina" y contiene el módulo bajo', () => {
    almacen.getState().crear('cocina', 400, 330, 250)
    render(<PanelCatalogo />)
    const grupos = screen.getAllByRole('region')
    expect(grupos[0]).toBe(screen.getByRole('region', { name: 'Para tu cocina' }))
    expect(within(grupos[0]!).getByRole('button', { name: /^Módulo bajo/ })).toBeTruthy()
  })

  it('en un despacho, el primer grupo es "Para tu despacho" y contiene los escritorios y la silla de oficina', () => {
    almacen.getState().crear('despacho', 400, 330, 250)
    render(<PanelCatalogo />)
    const grupos = screen.getAllByRole('region')
    expect(grupos[0]).toBe(screen.getByRole('region', { name: 'Para tu despacho' }))
    for (const nombre of [/^Escritorio \d/, /^Escritorio en L/, /^Silla de oficina/]) {
      expect(within(grupos[0]!).getByRole('button', { name: nombre })).toBeTruthy()
    }
  })

  it('en un baño, el primer grupo es "Para tu baño" con los sanitarios, y el espejo va en la decoración', () => {
    almacen.getState().crear('bano', 250, 200, 250)
    render(<PanelCatalogo />)
    const grupos = screen.getAllByRole('region')
    expect(grupos[0]).toBe(screen.getByRole('region', { name: 'Para tu baño' }))
    for (const nombre of [/^Inodoro/, /^Bidé/, /^Lavabo/, /^Plato de ducha/, /^Bañera/, /^Lavadora/, /^Columna de baño/, /^Armario de espejo/]) {
      expect(within(grupos[0]!).getByRole('button', { name: nombre })).toBeTruthy()
    }
    expect(within(screen.getByRole('region', { name: 'Decoración' })).getByRole('button', { name: /^Espejo/ })).toBeTruthy()
  })

  it('pulsar "Armario" en "Otros muebles" lo añade en el centro y lo deja seleccionado', async () => {
    almacen.getState().crear('salon', 400, 330, 250)
    almacen.getState().irAPaso(2)
    render(<PanelCatalogo />)
    const otros = screen.getByRole('region', { name: 'Otros muebles' })
    const boton = within(otros).getByRole('button', { name: /^Armario(?! de espejo| esquinero)/ })
    expect(boton.getAttribute('draggable')).toBe('true')
    expect(boton.textContent).toContain('100 × 60 cm')
    await userEvent.click(boton)
    const { documento, seleccion } = almacen.getState()
    expect(documento!.elementos).toHaveLength(1)
    const armario = documento!.elementos[0]!
    expect(armario.tipo).toBe('armario')
    expect(seleccion).toEqual({ tipo: 'elemento', id: armario.id })
  })
})

describe('PanelCatalogo en una L', () => {
  it('pulsar un tipo lo añade dentro de la planta aunque el centro de la caja caiga fuera', async () => {
    const ele = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 150 }, { x: 150, y: 150 }, { x: 150, y: 400 }, { x: 0, y: 400 }]
    almacen.getState().crear('salon', 400, 400, 250)
    almacen.getState().cambiar((d) => ({ ...d, estancia: { ...d.estancia, planta: ele } }))
    almacen.getState().irAPaso(2)
    render(<PanelCatalogo />)
    await userEvent.click(within(screen.getByRole('region', { name: 'Otros muebles' })).getByRole('button', { name: /^Armario(?! de espejo| esquinero)/ }))
    const armario = almacen.getState().documento!.elementos[0]!
    expect(contienePunto(ele, armario.posicion)).toBe(true)
  })

  it('los chips dejan un solo grupo a la vista; volver a pulsarlo enseña todos', async () => {
    almacen.getState().crear('dormitorio', 400, 330, 250)
    render(<PanelCatalogo />)
    const chips = within(screen.getByRole('group', { name: textos.catalogo.grupos })).getAllByRole('button')
    expect(chips.map((c) => c.textContent)).toEqual(['Para tu dormitorio', 'Decoración', 'Otros muebles'])
    expect(chips.every((c) => c.getAttribute('aria-pressed') === 'false')).toBe(true)
    expect(screen.getAllByRole('region')).toHaveLength(3)

    await userEvent.click(chips[1]!)
    expect(chips[1]).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('region')).toHaveLength(1)
    expect(screen.getByRole('region', { name: 'Decoración' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Armario(?! de espejo| esquinero)/ })).toBeNull()

    await userEvent.click(chips[1]!)
    expect(chips[1]).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getAllByRole('region')).toHaveLength(3)
  })

  it('el buscador filtra dentro del grupo elegido', async () => {
    almacen.getState().crear('dormitorio', 400, 330, 250)
    render(<PanelCatalogo />)
    await userEvent.click(screen.getByRole('button', { name: 'Otros muebles' }))
    await userEvent.type(screen.getByRole('searchbox', { name: textos.catalogo.buscar }), 'lampara')
    expect(screen.getByText(textos.catalogo.sinResultados)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Otros muebles' }))
    expect(screen.getByRole('button', { name: /^Lámpara de pie/ })).toBeInTheDocument()
  })

  it('el buscador filtra sin distinguir mayúsculas ni tildes', async () => {
    almacen.getState().crear('dormitorio', 400, 330, 250)
    render(<PanelCatalogo />)
    await userEvent.type(screen.getByRole('searchbox', { name: textos.catalogo.buscar }), 'LAMPARA')
    expect(screen.getByRole('button', { name: /^Lámpara de pie/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Armario(?! de espejo| esquinero)/ })).toBeNull()
  })

  it('sin coincidencias lo dice y no deja grupos vacíos', async () => {
    almacen.getState().crear('dormitorio', 400, 330, 250)
    render(<PanelCatalogo />)
    await userEvent.type(screen.getByRole('searchbox', { name: textos.catalogo.buscar }), 'zzz')
    expect(screen.getByText(textos.catalogo.sinResultados)).toBeInTheDocument()
    expect(screen.queryAllByRole('region')).toHaveLength(0)
  })
})

describe('PanelCatalogo con el dedo', () => {
  const elementFromPointOriginal = document.elementFromPoint
  const dedo = { pointerType: 'touch', pointerId: 1 }
  const asaDe = (nombre: RegExp) => screen.getByRole('button', { name: nombre }).querySelector<HTMLElement>('.panel-catalogo__asa')!
  const fantasma = () => document.querySelector('.panel-catalogo__fantasma')

  beforeEach(() => {
    almacen.getState().crear('dormitorio', 400, 330, 250)
    almacen.getState().irAPaso(2)
  })

  afterEach(() => {
    document.elementFromPoint = elementFromPointOriginal
  })

  it('arrastrar con el dedo desde el asa y soltar en el plano añade el mueble ahí', () => {
    const { container } = render(<><PanelCatalogo /><Lienzo /></>)
    const svg = container.querySelector('.lienzo__svg')!
    document.elementFromPoint = vi.fn(() => svg)
    const asa = asaDe(/^Armario(?! de espejo| esquinero)/)
    fireEvent.pointerDown(asa, { ...dedo, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(asa, { ...dedo, clientX: 90, clientY: 100 })
    expect(fantasma()?.textContent).toBe('Armario')
    fireEvent.pointerUp(asa, { ...dedo, clientX: 120, clientY: 140 })
    // El clic que el navegador genera tras soltar no añade otro en el centro.
    fireEvent.click(asa)
    expect(document.elementFromPoint).toHaveBeenCalledWith(120, 140)
    expect(fantasma()).toBeNull()
    const { documento, seleccion } = almacen.getState()
    expect(documento!.elementos).toHaveLength(1)
    const armario = documento!.elementos[0]!
    expect(armario.tipo).toBe('armario')
    expect(armario.posicion).toEqual({ x: 120, y: 140 })
    expect(seleccion).toEqual({ tipo: 'elemento', id: armario.id })
  })

  it('soltar fuera del plano no añade nada ni dispara el clic', () => {
    const { container } = render(<><PanelCatalogo /><Lienzo /></>)
    document.elementFromPoint = vi.fn(() => container.querySelector('.panel-catalogo__buscar'))
    const asa = asaDe(/^Armario(?! de espejo| esquinero)/)
    fireEvent.pointerDown(asa, { ...dedo, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(asa, { ...dedo, clientX: 60, clientY: 80 })
    fireEvent.pointerUp(asa, { ...dedo, clientX: 60, clientY: 80 })
    fireEvent.click(asa)
    expect(fantasma()).toBeNull()
    expect(almacen.getState().documento!.elementos).toHaveLength(0)
  })

  it('empezar a arrastrar cierra la hoja', () => {
    const alEmpezar = vi.fn()
    const { container } = render(<><PanelCatalogo alEmpezarArrastre={alEmpezar} /><Lienzo /></>)
    document.elementFromPoint = vi.fn(() => container.querySelector('.lienzo__svg'))
    fireEvent.pointerDown(asaDe(/^Armario(?! de espejo| esquinero)/), { ...dedo, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(asaDe(/^Armario(?! de espejo| esquinero)/), { ...dedo, clientX: 70, clientY: 70 })
    expect(alEmpezar).toHaveBeenCalledTimes(1)
    // Si el sistema cancela el toque, el arrastre acaba sin añadir nada.
    fireEvent.pointerCancel(asaDe(/^Armario(?! de espejo| esquinero)/), { ...dedo, clientX: 120, clientY: 140 })
    expect(fantasma()).toBeNull()
    expect(almacen.getState().documento!.elementos).toHaveLength(0)
  })

  it('un toque en el asa sin moverse no cierra la hoja ni añade nada', () => {
    const alEmpezar = vi.fn()
    const { container } = render(<><PanelCatalogo alEmpezarArrastre={alEmpezar} /><Lienzo /></>)
    document.elementFromPoint = vi.fn(() => container.querySelector('.lienzo__svg'))
    const asa = asaDe(/^Armario(?! de espejo| esquinero)/)
    fireEvent.pointerDown(asa, { ...dedo, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(asa, { ...dedo, clientX: 51, clientY: 51 })
    expect(fantasma()).toBeNull()
    fireEvent.pointerUp(asa, { ...dedo, clientX: 51, clientY: 51 })
    fireEvent.click(asa)
    expect(alEmpezar).not.toHaveBeenCalled()
    expect(almacen.getState().documento!.elementos).toHaveLength(0)
  })

  it('un arrastre abandonado (sin pointerup) se descarta en la siguiente pulsación del mismo puntero: no suelta nada', () => {
    const { container } = render(<><PanelCatalogo /><Lienzo /></>)
    const svg = container.querySelector('.lienzo__svg')!
    document.elementFromPoint = vi.fn(() => svg)
    const asa = asaDe(/^Armario(?! de espejo| esquinero)/)
    fireEvent.pointerDown(asa, { ...dedo, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(asa, { ...dedo, clientX: 90, clientY: 100 })
    // El pointerup se perdió. La siguiente pulsación con el mismo id es otra cosa (aquí, en el vacío del plano).
    fireEvent.pointerDown(svg, { pointerType: 'mouse', pointerId: 1, clientX: 120, clientY: 140 })
    fireEvent.pointerUp(svg, { pointerType: 'mouse', pointerId: 1, clientX: 120, clientY: 140 })
    expect(fantasma()).toBeNull()
    expect(almacen.getState().documento!.elementos).toHaveLength(0)
  })

  it('también si la pulsación siguiente es en otra asa (que para la propagación): solo cae el mueble nuevo', () => {
    const { container } = render(<><PanelCatalogo /><Lienzo /></>)
    const svg = container.querySelector('.lienzo__svg')!
    document.elementFromPoint = vi.fn(() => svg)
    const raton = { pointerType: 'mouse', pointerId: 1 }
    fireEvent.pointerDown(asaDe(/^Armario(?! de espejo| esquinero)/), { ...raton, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(asaDe(/^Armario(?! de espejo| esquinero)/), { ...raton, clientX: 90, clientY: 100 })
    // Se pierde el pointerup; se arrastra otro tipo con el mismo puntero.
    const asa = asaDe(/^Cama/)
    fireEvent.pointerDown(asa, { ...raton, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(asa, { ...raton, clientX: 90, clientY: 100 })
    fireEvent.pointerUp(asa, { ...raton, clientX: 150, clientY: 160 })
    const elementos = almacen.getState().documento!.elementos
    expect(elementos.map((e) => e.tipo)).toEqual([expect.stringMatching(/^cama/)])
  })

  it('si el catálogo se desmonta a mitad del arrastre, soltar luego en el plano no añade nada', () => {
    const { container, rerender } = render(<><PanelCatalogo /><Lienzo /></>)
    document.elementFromPoint = vi.fn(() => container.querySelector('.lienzo__svg'))
    const asa = asaDe(/^Armario(?! de espejo| esquinero)/)
    fireEvent.pointerDown(asa, { ...dedo, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(asa, { ...dedo, clientX: 90, clientY: 100 })
    rerender(<><Lienzo /></>)
    expect(fantasma()).toBeNull()
    fireEvent.pointerUp(window, { ...dedo, clientX: 120, clientY: 140 })
    expect(almacen.getState().documento!.elementos).toHaveLength(0)
  })
})
