// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { catalogoBase, elementoNuevo, type Abertura, type Punto } from '../../nucleo'
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
