// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { catalogoBase, elementoNuevo, longitudPared, type Abertura, type Punto } from '../../nucleo'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import Lienzo from './Lienzo'
import { usePuntoDelPlano } from './usarPuntoDelPlano'

function colocar(tipo: string, id: string, posicion: Punto) {
  const def = catalogoBase.get(tipo)
  if (!def) throw new Error(tipo)
  almacen.getState().cambiar((d) => ({ ...d, elementos: [...d.elementos, elementoNuevo(def, posicion, id)] }))
}

beforeEach(() => {
  reiniciarAlmacen()
  almacen.getState().crear('dormitorio', 400, 330, 250)
  almacen.getState().irAPaso(2)
})

describe('Lienzo', () => {
  it('marca en rojo un armario y una cama solapados', () => {
    colocar('armario', 'a', { x: 80, y: 50 })
    colocar('cama', 'c', { x: 130, y: 130 })
    const { container } = render(<Lienzo />)
    expect(container.querySelector('[data-conflicto]')).not.toBeNull()
    expect(container.querySelectorAll('[data-zona-conflicto]').length).toBeGreaterThan(0)
  })

  it('sin rojo si están separados 50 cm', () => {
    colocar('armario', 'a', { x: 80, y: 50 })
    colocar('cama', 'c', { x: 255, y: 130 })
    const { container } = render(<Lienzo />)
    expect(container.querySelector('[data-conflicto]')).toBeNull()
    expect(container.querySelector('[data-zona-conflicto]')).toBeNull()
  })

  it('dibuja discontinuo el barrido de un armario de puertas abatibles', () => {
    colocar('armario', 'a', { x: 80, y: 50 })
    const { container } = render(<Lienzo />)
    const discontinuos = [...container.querySelectorAll('[data-elemento="a"] path, [data-elemento="a"] polygon')]
      .filter((n) => n.getAttribute('stroke-dasharray') !== null)
    expect(discontinuos.length).toBeGreaterThan(0)
  })

  it('pulsar un elemento lo selecciona y pulsar el fondo lo anula', () => {
    colocar('armario', 'a', { x: 80, y: 50 })
    const { container } = render(<Lienzo />)
    const elemento = container.querySelector('[data-elemento="a"] polygon')
    if (!elemento) throw new Error('sin elemento')
    fireEvent.pointerDown(elemento, { pointerId: 1, clientX: 80, clientY: 50 })
    expect(almacen.getState().seleccion).toEqual({ tipo: 'elemento', id: 'a' })
    const svg = container.querySelector('svg')
    if (!svg) throw new Error('sin svg')
    fireEvent.pointerDown(svg, { pointerId: 1, clientX: 5, clientY: 5 })
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 5, clientY: 5 })
    expect(almacen.getState().seleccion).toBeNull()
  })

  it('en el paso 1 los muebles no se seleccionan', () => {
    colocar('armario', 'a', { x: 80, y: 50 })
    almacen.getState().irAPaso(1)
    const { container } = render(<Lienzo />)
    const elemento = container.querySelector('[data-elemento="a"] polygon')
    if (!elemento) throw new Error('sin elemento')
    fireEvent.pointerDown(elemento, { pointerId: 1 })
    expect(almacen.getState().seleccion).toBeNull()
  })
})

describe('Lienzo: estancia', () => {
  const puerta: Abertura = { id: 'p', tipo: 'puerta', pared: 0, posicion: 50, ancho: 80, alto: 210, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' }

  it('dibuja la puerta abatible con el barrido discontinuo y la selecciona en el paso 1', () => {
    almacen.getState().cambiar((d) => ({ ...d, aberturas: [puerta] }))
    almacen.getState().irAPaso(1)
    const { container } = render(<Lienzo />)
    const barrido = container.querySelector('[data-abertura="p"] path')
    expect(barrido?.getAttribute('stroke-dasharray')).not.toBeNull()
    const vano = container.querySelector('[data-abertura="p"] polygon')
    if (!vano) throw new Error('sin vano')
    fireEvent.pointerDown(vano, { pointerId: 1 })
    expect(almacen.getState().seleccion).toEqual({ tipo: 'abertura', id: 'p' })
  })

  it('en el paso 2 la estructura no se selecciona', () => {
    almacen.getState().cambiar((d) => ({ ...d, estructura: [{ id: 'col', tipo: 'columna', centro: { x: 200, y: 165 }, ancho: 30, fondo: 30, rotacion: 0 }] }))
    const { container } = render(<Lienzo />)
    const columna = container.querySelector('[data-estructura="col"] polygon')
    if (!columna) throw new Error('sin columna')
    fireEvent.pointerDown(columna, { pointerId: 1 })
    expect(almacen.getState().seleccion).toBeNull()
  })

  it('usePuntoDelPlano convierte la posición del puntero a cm', () => {
    const puntos: Punto[] = []
    function Tirador() {
      const aPlano = usePuntoDelPlano()
      return <circle data-tirador="" r={5} onPointerDown={(ev) => { ev.stopPropagation(); puntos.push(aPlano(ev)) }} />
    }
    const { container } = render(<Lienzo><Tirador /></Lienzo>)
    const tirador = container.querySelector('[data-tirador]')
    if (!tirador) throw new Error('sin tirador')
    fireEvent.pointerDown(tirador, { pointerId: 1, clientX: 30, clientY: 40 })
    // jsdom: svg sin tamaño, vista identidad.
    expect(puntos).toEqual([{ x: 30, y: 40 }])
  })
})

describe('Lienzo: paso 1', () => {
  const puerta: Abertura = { id: 'p', tipo: 'puerta', pared: 0, posicion: 50, ancho: 80, alto: 210, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' }
  const pieza = (container: HTMLElement, selector: string) => {
    const n = container.querySelector(selector)
    if (!n) throw new Error(`sin ${selector}`)
    return n
  }

  beforeEach(() => almacen.getState().irAPaso(1))

  it('cada pared lleva su cota y pulsarla, o pulsar el muro, selecciona la pared', () => {
    const { container } = render(<Lienzo />)
    expect(pieza(container, '[data-cota="0"]').textContent).toBe('400 cm')
    expect(pieza(container, '[data-cota="1"]').textContent).toBe('330 cm')
    fireEvent.pointerDown(pieza(container, '[data-cota="1"] text'), { pointerId: 1 })
    expect(almacen.getState().seleccion).toEqual({ tipo: 'pared', indice: 1 })
    fireEvent.pointerDown(pieza(container, '[data-pared="2"]'), { pointerId: 1 })
    expect(almacen.getState().seleccion).toEqual({ tipo: 'pared', indice: 2 })
  })

  it('el "+" parte la pared', () => {
    const { container } = render(<Lienzo />)
    fireEvent.pointerDown(pieza(container, '[data-partir="0"]'), { pointerId: 1 })
    const planta = almacen.getState().documento!.estancia.planta
    expect(planta).toHaveLength(5)
    expect(longitudPared(planta, 0)).toBe(200)
  })

  it('arrastrar un vértice lo mueve en cm enteros y se deshace de una vez', () => {
    const { container } = render(<Lienzo />)
    const vertice = pieza(container, '[data-vertice="2"]')
    fireEvent.pointerDown(vertice, { pointerId: 1, clientX: 400, clientY: 330 })
    expect(almacen.getState().seleccion).toEqual({ tipo: 'vertice', indice: 2 })
    fireEvent.pointerMove(vertice, { pointerId: 1, clientX: 420, clientY: 360 })
    fireEvent.pointerMove(vertice, { pointerId: 1, clientX: 452.6, clientY: 403 })
    fireEvent.pointerUp(vertice, { pointerId: 1, clientX: 452.6, clientY: 403 })
    expect(almacen.getState().documento!.estancia.planta[2]).toEqual({ x: 453, y: 403 })
    expect(almacen.getState().grupo).toBeNull()
    almacen.getState().deshacer()
    expect(almacen.getState().documento!.estancia.planta[2]).toEqual({ x: 400, y: 330 })
  })

  it('el vértice se alinea con su vecino al acercarse', () => {
    const { container } = render(<Lienzo />)
    const vertice = pieza(container, '[data-vertice="2"]')
    fireEvent.pointerDown(vertice, { pointerId: 1, clientX: 400, clientY: 330 })
    fireEvent.pointerMove(vertice, { pointerId: 1, clientX: 403, clientY: 400 })
    fireEvent.pointerUp(vertice, { pointerId: 1 })
    expect(almacen.getState().documento!.estancia.planta[2]).toEqual({ x: 400, y: 400 })
  })

  it('arrastrar una puerta la lleva por su pared, recortada al final', () => {
    almacen.getState().cambiar((d) => ({ ...d, aberturas: [puerta] }))
    const { container } = render(<Lienzo />)
    const vano = pieza(container, '[data-abertura="p"] polygon')
    fireEvent.pointerDown(vano, { pointerId: 1, clientX: 90, clientY: -5 })
    expect(almacen.getState().seleccion).toEqual({ tipo: 'abertura', id: 'p' })
    fireEvent.pointerMove(vano, { pointerId: 1, clientX: 150.4, clientY: 40 })
    expect(almacen.getState().documento!.aberturas[0]!.posicion).toBe(110)
    fireEvent.pointerMove(vano, { pointerId: 1, clientX: 900, clientY: 0 })
    expect(almacen.getState().documento!.aberturas[0]!.posicion).toBe(320)
    fireEvent.pointerUp(vano, { pointerId: 1 })
    expect(almacen.getState().grupo).toBeNull()
    almacen.getState().deshacer()
    expect(almacen.getState().documento!.aberturas[0]!.posicion).toBe(50)
  })

  it('arrastrar una columna mueve su centro en cm enteros', () => {
    almacen.getState().cambiar((d) => ({ ...d, estructura: [{ id: 'col', tipo: 'columna', centro: { x: 200, y: 165 }, ancho: 30, fondo: 30, rotacion: 0 }] }))
    const { container } = render(<Lienzo />)
    const columna = pieza(container, '[data-estructura="col"] polygon')
    fireEvent.pointerDown(columna, { pointerId: 1, clientX: 200, clientY: 165 })
    fireEvent.pointerMove(columna, { pointerId: 1, clientX: 230.7, clientY: 145.2 })
    fireEvent.pointerUp(columna, { pointerId: 1 })
    const col = almacen.getState().documento!.estructura[0]!
    expect(col.tipo === 'columna' && col.centro).toEqual({ x: 231, y: 145 })
  })

  it('una viga seleccionada se estira por un extremo', () => {
    almacen.getState().cambiar((d) => ({ ...d, estructura: [{ id: 'v', tipo: 'viga', desde: { x: 200, y: 0 }, hasta: { x: 200, y: 330 }, ancho: 20, canto: 30 }] }))
    almacen.getState().seleccionar({ tipo: 'estructura', id: 'v' })
    const { container } = render(<Lienzo />)
    const extremo = pieza(container, '[data-extremo="hasta"]')
    fireEvent.pointerDown(extremo, { pointerId: 1, clientX: 200, clientY: 330 })
    fireEvent.pointerMove(extremo, { pointerId: 1, clientX: 250, clientY: 300 })
    fireEvent.pointerUp(extremo, { pointerId: 1 })
    const viga = almacen.getState().documento!.estructura[0]!
    expect(viga.tipo === 'viga' && viga.hasta).toEqual({ x: 250, y: 300 })
  })

  it('un mueble en conflicto y seleccionado sigue en rojo, con halo de selección', () => {
    colocar('armario', 'a', { x: 80, y: 50 })
    colocar('cama', 'c', { x: 130, y: 130 })
    almacen.getState().irAPaso(2)
    almacen.getState().seleccionar({ tipo: 'elemento', id: 'a' })
    const { container } = render(<Lienzo />)
    expect(container.querySelector('[data-elemento="a"][data-conflicto]')).not.toBeNull()
    expect(container.querySelector('[data-elemento="a"] .capa-elementos__halo')).not.toBeNull()
  })

  it('en el paso 2 no hay tiradores ni cotas de pared', () => {
    almacen.getState().irAPaso(2)
    const { container } = render(<Lienzo />)
    expect(container.querySelector('[data-vertice]')).toBeNull()
    expect(container.querySelector('[data-cota]')).toBeNull()
  })
})
