// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { anadirElemento, catalogoBase } from '../nucleo'
import { almacen, reiniciarAlmacen } from './estado/almacen'
import { hayArrastre } from './lienzo/arrastres'
import Lienzo from './lienzo/Lienzo'
import { useAtajos } from './usarAtajos'

function Sonda() {
  useAtajos()
  return <input aria-label="campo" />
}

beforeEach(() => {
  reiniciarAlmacen()
  almacen.getState().crear('salon', 400, 330, 250)
  almacen.getState().cambiar((d) => ({ ...d, estancia: { ...d.estancia, alto: 260 } }))
})

describe('usarAtajos', () => {
  it('Ctrl+Z deshace y Ctrl+Y rehace', () => {
    render(<Sonda />)
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(almacen.getState().documento?.estancia.alto).toBe(250)
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true })
    expect(almacen.getState().documento?.estancia.alto).toBe(260)
  })

  it('Ctrl+Shift+Z rehace y Cmd+Z deshace', () => {
    render(<Sonda />)
    fireEvent.keyDown(window, { key: 'z', metaKey: true })
    expect(almacen.getState().documento?.estancia.alto).toBe(250)
    fireEvent.keyDown(window, { key: 'Z', ctrlKey: true, shiftKey: true })
    expect(almacen.getState().documento?.estancia.alto).toBe(260)
  })

  it('con el foco en un input no deshace', () => {
    render(<Sonda />)
    fireEvent.keyDown(screen.getByLabelText('campo'), { key: 'z', ctrlKey: true })
    expect(almacen.getState().documento?.estancia.alto).toBe(260)
  })

  it('con un diálogo abierto no actúa', () => {
    almacen.getState().seleccionar({ tipo: 'pared', indice: 0 })
    render(<Sonda />)
    const d = document.createElement('dialog')
    d.setAttribute('open', '')
    document.body.appendChild(d)
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'Escape' })
    d.remove()
    expect(almacen.getState().documento?.estancia.alto).toBe(260)
    expect(almacen.getState().seleccion).not.toBeNull()
  })

  it('Escape anula la selección', () => {
    almacen.getState().seleccionar({ tipo: 'pared', indice: 0 })
    render(<Sonda />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(almacen.getState().seleccion).toBeNull()
  })
  it('Supr quita la abertura seleccionada y Retroceso la columna', () => {
    almacen.getState().cambiar((d) => ({
      ...d,
      aberturas: [{ id: 'v', tipo: 'ventana', pared: 0, posicion: 50, ancho: 100, alto: 120, alturaSuelo: 90, abreHaciaDentro: false }],
      estructura: [{ id: 'c', tipo: 'columna', centro: { x: 200, y: 165 }, ancho: 30, fondo: 30, rotacion: 0 }],
    }))
    render(<Sonda />)
    almacen.getState().seleccionar({ tipo: 'abertura', id: 'v' })
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(almacen.getState().documento?.aberturas).toHaveLength(0)
    almacen.getState().seleccionar({ tipo: 'estructura', id: 'c' })
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(almacen.getState().documento?.estructura).toHaveLength(0)
  })

  it('Supr con un vértice seleccionado quita la esquina', () => {
    almacen.getState().seleccionar({ tipo: 'vertice', indice: 2 })
    render(<Sonda />)
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(almacen.getState().documento?.estancia.planta).toHaveLength(3)
    expect(almacen.getState().seleccion).toBeNull()
  })
})

describe('Supr del paso 1 fuera del paso 1', () => {
  it('en el paso 2 no borra una abertura, estructura ni vértice que siguieran seleccionados', () => {
    almacen.getState().cambiar((d) => ({
      ...d,
      aberturas: [{ id: 'v', tipo: 'ventana', pared: 0, posicion: 50, ancho: 100, alto: 120, alturaSuelo: 90, abreHaciaDentro: false }],
      estructura: [{ id: 'c', tipo: 'columna', centro: { x: 200, y: 165 }, ancho: 30, fondo: 30, rotacion: 0 }],
    }))
    render(<Sonda />)
    for (const seleccion of [{ tipo: 'abertura', id: 'v' }, { tipo: 'estructura', id: 'c' }, { tipo: 'vertice', indice: 2 }] as const) {
      almacen.setState({ paso: 2, seleccion })
      fireEvent.keyDown(window, { key: 'Delete' })
    }
    const d = almacen.getState().documento!
    expect(d.aberturas).toHaveLength(1)
    expect(d.estructura).toHaveLength(1)
    expect(d.estancia.planta).toHaveLength(4)
  })
})

describe('usarAtajos en el paso 2', () => {
  const elementos = () => almacen.getState().documento!.elementos

  beforeEach(() => {
    const r = anadirElemento(almacen.getState().documento!, catalogoBase, 'mesa', { x: 200, y: 165 })
    almacen.getState().cambiar(() => r.documento)
    almacen.getState().irAPaso(2)
    almacen.getState().seleccionar({ tipo: 'elemento', id: r.id })
  })

  it('R gira el elemento 90°', () => {
    render(<Sonda />)
    expect(elementos()[0]!.rotacion).toBe(0)
    fireEvent.keyDown(window, { key: 'r' })
    expect(elementos()[0]!.rotacion).toBe(90)
  })

  it('Mayúsculas+R lo gira −90°', () => {
    render(<Sonda />)
    fireEvent.keyDown(window, { key: 'R', shiftKey: true })
    expect(elementos()[0]!.rotacion).toBe(270)
  })

  it('Supr borra el elemento seleccionado', () => {
    render(<Sonda />)
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(elementos()).toHaveLength(0)
    expect(almacen.getState().seleccion).toBeNull()
  })

  it('Ctrl+D lo duplica y selecciona la copia', () => {
    render(<Sonda />)
    const original = elementos()[0]!.id
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true })
    expect(elementos()).toHaveLength(2)
    expect(almacen.getState().seleccion).toEqual({ tipo: 'elemento', id: elementos()[1]!.id })
    expect(elementos()[1]!.id).not.toBe(original)
  })
})

describe('usarAtajos durante un arrastre', () => {
  it('R, Supr y Ctrl+D no actúan mientras se arrastra un mueble', () => {
    const r = anadirElemento(almacen.getState().documento!, catalogoBase, 'mesa', { x: 200, y: 165 })
    almacen.getState().cambiar(() => r.documento)
    almacen.getState().irAPaso(2)
    render(<><Sonda /><Lienzo /></>)
    const huella = document.querySelector(`[data-elemento="${r.id}"] polygon`)
    if (!huella) throw new Error('sin huella')
    fireEvent.pointerDown(huella, { pointerId: 1, clientX: 200, clientY: 165 })
    fireEvent.pointerMove(huella, { pointerId: 1, clientX: 210, clientY: 165 })
    fireEvent.keyDown(window, { key: 'r' })
    fireEvent.keyDown(window, { key: 'Delete' })
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true })
    const elementos = almacen.getState().documento!.elementos
    expect(elementos).toHaveLength(1)
    expect(elementos[0]!.rotacion).toBe(0)
    fireEvent.pointerUp(huella, { pointerId: 1 })
    fireEvent.keyDown(window, { key: 'r' })
    expect(almacen.getState().documento!.elementos[0]!.rotacion).toBe(90)
  })
})

describe('usarAtajos durante un arrastre: todo lo que edita espera', () => {
  it('Ctrl+Z y Ctrl+Y no actúan hasta soltar', () => {
    const r = anadirElemento(almacen.getState().documento!, catalogoBase, 'mesa', { x: 200, y: 165 })
    almacen.getState().cambiar(() => r.documento)
    almacen.getState().irAPaso(2)
    render(<><Sonda /><Lienzo /></>)
    const huella = document.querySelector(`[data-elemento="${r.id}"] polygon`)
    if (!huella) throw new Error('sin huella')
    const posicion = () => almacen.getState().documento!.elementos[0]!.posicion
    // Con algo que rehacer, pulsar sin mover ya es arrastre: Ctrl+Y espera.
    almacen.getState().cambiar((d) => ({ ...d, estancia: { ...d.estancia, alto: 270 } }))
    almacen.getState().deshacer()
    fireEvent.pointerDown(huella, { pointerId: 1, clientX: 200, clientY: 165 })
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true })
    expect(almacen.getState().documento!.estancia.alto).toBe(260)
    fireEvent.pointerMove(huella, { pointerId: 1, clientX: 230, clientY: 165 })
    expect(posicion()).toEqual({ x: 230, y: 165 })
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(posicion()).toEqual({ x: 230, y: 165 })
    fireEvent.pointerUp(huella, { pointerId: 1 })
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(posicion()).toEqual({ x: 200, y: 165 })
  })

  it('Supr del paso 1 no quita la abertura que se está arrastrando', () => {
    almacen.getState().cambiar((d) => ({
      ...d,
      aberturas: [{ id: 'v', tipo: 'ventana', pared: 0, posicion: 50, ancho: 100, alto: 120, alturaSuelo: 90, abreHaciaDentro: false }],
    }))
    render(<><Sonda /><Lienzo /></>)
    const vano = document.querySelector('[data-abertura="v"] polygon')
    if (!vano) throw new Error('sin vano')
    fireEvent.pointerDown(vano, { pointerId: 1, clientX: 100, clientY: 0 })
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(almacen.getState().documento!.aberturas).toHaveLength(1)
    fireEvent.pointerUp(vano, { pointerId: 1 })
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(almacen.getState().documento!.aberturas).toHaveLength(0)
  })

  it('perder la captura del puntero cuenta como soltar', () => {
    almacen.getState().cambiar((d) => ({
      ...d,
      aberturas: [{ id: 'v', tipo: 'ventana', pared: 0, posicion: 50, ancho: 100, alto: 120, alturaSuelo: 90, abreHaciaDentro: false }],
    }))
    render(<><Sonda /><Lienzo /></>)
    const vano = document.querySelector('[data-abertura="v"] polygon')
    if (!vano) throw new Error('sin vano')
    fireEvent.pointerDown(vano, { pointerId: 1, clientX: 100, clientY: 0 })
    expect(hayArrastre()).toBe(true)
    fireEvent.lostPointerCapture(vano, { pointerId: 1 })
    expect(hayArrastre()).toBe(false)
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(almacen.getState().documento!.aberturas).toHaveLength(0)
  })
})

describe('usarAtajos: un arrastre cuya pieza desaparece', () => {
  it('Escape durante el giro desmonta el tirador y soltar en la ventana termina el arrastre', () => {
    const r = anadirElemento(almacen.getState().documento!, catalogoBase, 'mesa', { x: 200, y: 165 })
    almacen.getState().cambiar(() => r.documento)
    almacen.getState().irAPaso(2)
    almacen.getState().seleccionar({ tipo: 'elemento', id: r.id })
    render(<><Sonda /><Lienzo /></>)
    const tirador = document.querySelector('[data-giro]')
    if (!tirador) throw new Error('sin tirador')
    const giro = () => almacen.getState().documento!.elementos[0]!.rotacion
    const { x, y } = { x: Number(tirador.getAttribute('cx')), y: Number(tirador.getAttribute('cy')) }
    fireEvent.pointerDown(tirador, { pointerId: 1, clientX: x, clientY: y })
    fireEvent.pointerMove(tirador, { pointerId: 1, clientX: 110, clientY: 165 })
    expect(giro()).toBe(90)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.querySelector('[data-giro]')).toBeNull()
    fireEvent.pointerUp(window, { pointerId: 1 })
    expect(hayArrastre()).toBe(false)
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(giro()).toBe(0)
  })

  it('otro puntero que se suelta en la ventana no termina el arrastre', () => {
    almacen.getState().cambiar((d) => ({
      ...d,
      aberturas: [{ id: 'v', tipo: 'ventana', pared: 0, posicion: 50, ancho: 100, alto: 120, alturaSuelo: 90, abreHaciaDentro: false }],
    }))
    render(<><Sonda /><Lienzo /></>)
    const vano = document.querySelector('[data-abertura="v"] polygon')
    if (!vano) throw new Error('sin vano')
    fireEvent.pointerDown(vano, { pointerId: 1, clientX: 100, clientY: 0 })
    fireEvent.pointerUp(window, { pointerId: 2 })
    expect(hayArrastre()).toBe(true)
    fireEvent.pointerCancel(window, { pointerId: 1 })
    expect(hayArrastre()).toBe(false)
  })
})

describe('usarAtajos en la vista 3D', () => {
  beforeEach(() => {
    const r = anadirElemento(almacen.getState().documento!, catalogoBase, 'mesa', { x: 200, y: 165 })
    almacen.getState().cambiar(() => r.documento)
    almacen.getState().irAPaso(2)
    almacen.getState().seleccionar({ tipo: 'elemento', id: r.id })
    almacen.getState().cambiarVista('3d')
  })

  it('R, Mayúsculas+R y Ctrl+D no hacen nada', () => {
    render(<Sonda />)
    fireEvent.keyDown(window, { key: 'r' })
    fireEvent.keyDown(window, { key: 'R', shiftKey: true })
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true })
    const elementos = almacen.getState().documento!.elementos
    expect(elementos).toHaveLength(1)
    expect(elementos[0]!.rotacion).toBe(0)
  })

  it('Supr borra, Ctrl+Z deshace y Escape deselecciona', () => {
    render(<Sonda />)
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(almacen.getState().documento!.elementos).toHaveLength(0)
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(almacen.getState().documento!.elementos).toHaveLength(1)
    almacen.getState().seleccionar({ tipo: 'elemento', id: almacen.getState().documento!.elementos[0]!.id })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(almacen.getState().seleccion).toBeNull()
  })
})
