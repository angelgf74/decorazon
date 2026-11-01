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

  it('pulsar "Armario" en "Otros muebles" lo añade en el centro y lo deja seleccionado', async () => {
    almacen.getState().crear('salon', 400, 330, 250)
    almacen.getState().irAPaso(2)
    render(<PanelCatalogo />)
    const otros = screen.getByRole('region', { name: 'Otros muebles' })
    const boton = within(otros).getByRole('button', { name: /^Armario/ })
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
    await userEvent.click(within(screen.getByRole('region', { name: 'Otros muebles' })).getByRole('button', { name: /^Armario/ }))
    const armario = almacen.getState().documento!.elementos[0]!
    expect(contienePunto(ele, armario.posicion)).toBe(true)
  })

  it('el buscador filtra sin distinguir mayúsculas ni tildes', async () => {
    almacen.getState().crear('dormitorio', 400, 330, 250)
    render(<PanelCatalogo />)
    await userEvent.type(screen.getByRole('searchbox', { name: textos.catalogo.buscar }), 'LAMPARA')
    expect(screen.getByRole('button', { name: /^Lámpara de pie/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Armario/ })).toBeNull()
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
    const asa = asaDe(/^Armario/)
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
    const asa = asaDe(/^Armario/)
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
    fireEvent.pointerDown(asaDe(/^Armario/), { ...dedo, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(asaDe(/^Armario/), { ...dedo, clientX: 70, clientY: 70 })
    expect(alEmpezar).toHaveBeenCalledTimes(1)
    // Si el sistema cancela el toque, el arrastre acaba sin añadir nada.
    fireEvent.pointerCancel(asaDe(/^Armario/), { ...dedo, clientX: 120, clientY: 140 })
    expect(fantasma()).toBeNull()
    expect(almacen.getState().documento!.elementos).toHaveLength(0)
  })

  it('un toque en el asa sin moverse no cierra la hoja ni añade nada', () => {
    const alEmpezar = vi.fn()
    const { container } = render(<><PanelCatalogo alEmpezarArrastre={alEmpezar} /><Lienzo /></>)
    document.elementFromPoint = vi.fn(() => container.querySelector('.lienzo__svg'))
    const asa = asaDe(/^Armario/)
    fireEvent.pointerDown(asa, { ...dedo, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(asa, { ...dedo, clientX: 51, clientY: 51 })
    expect(fantasma()).toBeNull()
    fireEvent.pointerUp(asa, { ...dedo, clientX: 51, clientY: 51 })
    fireEvent.click(asa)
    expect(alEmpezar).not.toHaveBeenCalled()
    expect(almacen.getState().documento!.elementos).toHaveLength(0)
  })
})
