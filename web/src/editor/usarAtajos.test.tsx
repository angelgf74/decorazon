// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { anadirElemento, bloquearElemento, catalogoBase } from '../nucleo'
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

describe('usarAtajos: soltar una flecha no cierra el paso de otra cosa', () => {
  it('un arrastre con el ratón sigue siendo un solo paso de deshacer aunque se suelte una flecha a mitad', () => {
    const r = anadirElemento(almacen.getState().documento!, catalogoBase, 'mesa', { x: 200, y: 165 })
    almacen.getState().cambiar(() => r.documento)
    almacen.getState().irAPaso(2)
    render(<><Sonda /><Lienzo /></>)
    const huella = document.querySelector(`[data-elemento="${r.id}"] polygon`)
    if (!huella) throw new Error('sin huella')
    const posicion = () => almacen.getState().documento!.elementos[0]!.posicion
    fireEvent.pointerDown(huella, { pointerId: 1, clientX: 200, clientY: 165 })
    fireEvent.pointerMove(huella, { pointerId: 1, clientX: 230, clientY: 165 })
    fireEvent.keyUp(window, { key: 'ArrowRight' })
    fireEvent.pointerMove(huella, { pointerId: 1, clientX: 260, clientY: 165 })
    fireEvent.pointerUp(huella, { pointerId: 1 })
    expect(posicion()).toEqual({ x: 260, y: 165 })
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(posicion()).toEqual({ x: 200, y: 165 })
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

describe('usarAtajos con un mueble bloqueado', () => {
  it('ni las flechas ni R lo mueven, y el historial no apunta nada', () => {
    const r = anadirElemento(almacen.getState().documento!, catalogoBase, 'armario', { x: 200, y: 165 })
    almacen.getState().cambiar(() => bloquearElemento(r.documento, r.id, true))
    almacen.getState().irAPaso(2)
    almacen.getState().seleccionar({ tipo: 'elemento', id: r.id })
    const pasos = almacen.getState().pasado.length
    render(<Sonda />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true })
    fireEvent.keyDown(window, { key: 'r' })
    const e = almacen.getState().documento!.elementos[0]!
    expect(e.posicion).toEqual({ x: 200, y: 165 })
    expect(e.rotacion).toBe(0)
    expect(almacen.getState().pasado).toHaveLength(pasos)
  })
})

describe('usarAtajos: flechas en el paso 2', () => {
  const elementos = () => almacen.getState().documento!.elementos
  const posicion = () => elementos()[0]!.posicion

  beforeEach(() => {
    // Armario a ras de la pared de arriba (y = 30 tras imantar): la flecha tiene que poder alejarlo 1 cm.
    const r = anadirElemento(almacen.getState().documento!, catalogoBase, 'armario', { x: 200, y: 38 })
    almacen.getState().cambiar(() => r.documento)
    almacen.getState().irAPaso(2)
    almacen.getState().seleccionar({ tipo: 'elemento', id: r.id })
    expect(posicion()).toEqual({ x: 200, y: 30 })
  })

  it('→ y ↓ mueven 1 cm; ← y ↑ vuelven; junto a la pared no se vuelve a pegar', () => {
    render(<Sonda />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(posicion()).toEqual({ x: 201, y: 30 })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(posicion()).toEqual({ x: 201, y: 31 })
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(posicion()).toEqual({ x: 200, y: 30 })
  })

  it('con Mayúsculas mueve 10 cm y evita el scroll de la página', () => {
    render(<Sonda />)
    expect(fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true, cancelable: true })).toBe(false)
    expect(posicion()).toEqual({ x: 210, y: 30 })
  })

  it('pulsaciones seguidas son un solo paso de deshacer; soltar la tecla cierra el paso', () => {
    render(<Sonda />)
    for (let i = 0; i < 10; i++) fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(posicion()).toEqual({ x: 210, y: 30 })
    fireEvent.keyUp(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyUp(window, { key: 'ArrowRight' })
    expect(posicion()).toEqual({ x: 211, y: 30 })
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(posicion()).toEqual({ x: 210, y: 30 })
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(posicion()).toEqual({ x: 200, y: 30 })
  })

  it('no mueve con el foco en un campo, con el evento ya atendido (menú abierto) ni en 3D', () => {
    render(<Sonda />)
    fireEvent.keyDown(screen.getByLabelText('campo'), { key: 'ArrowRight' })
    expect(posicion()).toEqual({ x: 200, y: 30 })
    const atendido = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true, bubbles: true })
    atendido.preventDefault()
    window.dispatchEvent(atendido)
    expect(posicion()).toEqual({ x: 200, y: 30 })
    almacen.getState().cambiarVista('3d')
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(posicion()).toEqual({ x: 200, y: 30 })
  })
})

describe('usarAtajos: flechas en el paso 1', () => {
  beforeEach(() => {
    almacen.getState().cambiar((d) => ({
      ...d,
      aberturas: [{ id: 'v', tipo: 'ventana', pared: 0, posicion: 50, ancho: 100, alto: 120, alturaSuelo: 90, abreHaciaDentro: false }],
      estructura: [
        { id: 'c', tipo: 'columna', centro: { x: 200, y: 165 }, ancho: 30, fondo: 30, rotacion: 0 },
        { id: 'g', tipo: 'viga', desde: { x: 0, y: 100 }, hasta: { x: 400, y: 100 }, ancho: 20, canto: 30 },
      ],
    }))
  })
  const doc = () => almacen.getState().documento!

  it('mueve la esquina seleccionada y el movimiento es un solo paso de deshacer', () => {
    almacen.getState().seleccionar({ tipo: 'vertice', indice: 2 })
    render(<Sonda />)
    fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(doc().estancia.planta[2]).toEqual({ x: 410, y: 331 })
    fireEvent.keyUp(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(doc().estancia.planta[2]).toEqual({ x: 400, y: 330 })
  })

  it('desplaza una ventana por su pared sin salirse de ella; ↑↓ no hacen nada en una pared horizontal', () => {
    almacen.getState().seleccionar({ tipo: 'abertura', id: 'v' })
    render(<Sonda />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(doc().aberturas[0]!.posicion).toBe(51)
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(doc().aberturas[0]!.posicion).toBe(51)
    for (let i = 0; i < 40; i++) fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true })
    expect(doc().aberturas[0]!.posicion).toBe(300)
    for (let i = 0; i < 40; i++) fireEvent.keyDown(window, { key: 'ArrowLeft', shiftKey: true })
    expect(doc().aberturas[0]!.posicion).toBe(0)
  })

  it('la flecha sigue la pantalla, no el sentido de la pared: en la de abajo → acerca al inicio y en una vertical mueve ↑↓', () => {
    // La planta es horaria: la pared 2 (abajo) va de derecha a izquierda y la 1 (derecha) de arriba abajo.
    almacen.getState().cambiar((d) => ({
      ...d,
      aberturas: [
        { id: 'abajo', tipo: 'ventana', pared: 2, posicion: 50, ancho: 100, alto: 120, alturaSuelo: 90, abreHaciaDentro: false },
        { id: 'derecha', tipo: 'ventana', pared: 1, posicion: 50, ancho: 100, alto: 120, alturaSuelo: 90, abreHaciaDentro: false },
      ],
    }))
    render(<Sonda />)
    almacen.getState().seleccionar({ tipo: 'abertura', id: 'abajo' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(doc().aberturas[0]!.posicion).toBe(49)
    almacen.getState().seleccionar({ tipo: 'abertura', id: 'derecha' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(doc().aberturas[1]!.posicion).toBe(51)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(doc().aberturas[1]!.posicion).toBe(51)
  })

  it('en el tope de la pared la flecha no crea un paso de deshacer vacío ni pierde el rehacer', () => {
    almacen.getState().cambiar((d) => ({ ...d, aberturas: [{ ...d.aberturas[0]!, posicion: 0 }] }))
    almacen.getState().cambiar((d) => ({ ...d, estancia: { ...d.estancia, alto: 270 } }))
    almacen.getState().deshacer()
    expect(almacen.getState().futuro).toHaveLength(1)
    almacen.getState().seleccionar({ tipo: 'abertura', id: 'v' })
    render(<Sonda />)
    expect(fireEvent.keyDown(window, { key: 'ArrowLeft', cancelable: true })).toBe(false)
    expect(doc().aberturas[0]!.posicion).toBe(0)
    expect(almacen.getState().futuro).toHaveLength(1)
  })

  it('en 3D las flechas tampoco mueven lo del paso 1', () => {
    almacen.getState().seleccionar({ tipo: 'vertice', indice: 2 })
    almacen.getState().cambiarVista('3d')
    render(<Sonda />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(doc().estancia.planta[2]).toEqual({ x: 400, y: 330 })
    almacen.getState().seleccionar({ tipo: 'abertura', id: 'v' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(doc().aberturas[0]!.posicion).toBe(50)
  })

  it('mueve el centro de una columna y la viga entera', () => {
    almacen.getState().seleccionar({ tipo: 'estructura', id: 'c' })
    render(<Sonda />)
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.keyDown(window, { key: 'ArrowUp', shiftKey: true })
    expect(doc().estructura[0]).toMatchObject({ centro: { x: 199, y: 155 } })
    almacen.getState().seleccionar({ tipo: 'estructura', id: 'g' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(doc().estructura[1]).toMatchObject({ desde: { x: 0, y: 101 }, hasta: { x: 400, y: 101 } })
  })

  it('un movimiento que deja la planta inválida se rechaza con aviso', () => {
    almacen.getState().cambiar((d) => ({ ...d, aberturas: [], estructura: [] }))
    almacen.getState().seleccionar({ tipo: 'vertice', indice: 0 })
    render(<Sonda />)
    // La esquina 0 (0, 0) no puede cruzar la pared de arriba: 330 cm hacia abajo, en pasos de 10, se para en el límite.
    for (let i = 0; i < 40; i++) fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true })
    expect(doc().estancia.planta[0]!.y).toBeLessThan(330)
    expect(almacen.getState().aviso).not.toBeNull()
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

  it('Ctrl+D, aunque no duplique, evita la acción del navegador (añadir marcador)', () => {
    render(<Sonda />)
    // fireEvent devuelve false si se llamó a preventDefault.
    expect(fireEvent.keyDown(window, { key: 'd', ctrlKey: true, cancelable: true })).toBe(false)
    expect(almacen.getState().documento!.elementos).toHaveLength(1)
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
