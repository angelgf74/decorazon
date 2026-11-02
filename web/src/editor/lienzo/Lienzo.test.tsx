// @vitest-environment jsdom
import { act, createEvent, fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { catalogoBase, desplazarPoligono, elementoNuevo, longitudPared, type Abertura, type Punto } from '../../nucleo'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import { hayArrastre } from './arrastres'
import Lienzo from './Lienzo'
import { encuadrar } from './vista'
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

  it('un mueble que sale de la estancia pinta un path evenodd', () => {
    colocar('armario', 'a', { x: 20, y: 100 })
    const { container } = render(<Lienzo />)
    const zona = container.querySelector('[data-zona-conflicto]')
    expect(zona?.tagName).toBe('path')
    expect(zona?.getAttribute('fill-rule')).toBe('evenodd')
    expect(zona?.getAttribute('d')?.match(/M/g)).toHaveLength(2)
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

  it('el "+" no tapa la cota en ninguna orientación de pared', () => {
    const { container } = render(<Lienzo />)
    const num = (n: Element, a: string) => Number(n.getAttribute(a))
    for (let i = 0; i < 4; i++) {
      const mas = pieza(container, `[data-partir="${i}"] circle`)
      const texto = pieza(container, `[data-cota="${i}"] text`)
      // Texto de 12 px: caja de unos ±25 × ±7 px alrededor de su centro; el "+" tiene 8 px de radio (escala 1 en jsdom).
      const dx = Math.abs(num(mas, 'cx') - num(texto, 'x'))
      const dy = Math.abs(num(mas, 'cy') - num(texto, 'y'))
      expect(dx > 25 + 8 || dy > 7 + 8).toBe(true)
    }
    // Sigue cerca del punto medio de la pared, por fuera: pared 1 (vertical, x = 400).
    const mas1 = pieza(container, '[data-partir="1"] circle')
    expect(num(mas1, 'cy')).toBe(165 + 32)
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

  it('al seleccionar una puerta se ven sus dos cotas en la pared', () => {
    almacen.getState().cambiar((d) => ({ ...d, aberturas: [{ ...puerta, ancho: 82 }] }))
    almacen.getState().irAPaso(1)
    const { container } = render(<Lienzo />)
    expect(container.querySelector('[data-cota-en-pared]')).toBeNull()
    act(() => almacen.getState().seleccionar({ tipo: 'abertura', id: 'p' }))
    const textos = [...container.querySelectorAll('[data-cota-en-pared] text')].map((t) => t.textContent)
    expect(textos).toEqual(['50 cm', '268 cm'])
  })

  it('un radiador seleccionado muestra sus cotas y una columna no', () => {
    almacen.getState().cambiar((d) => ({
      ...d,
      estructura: [
        { id: 'r', tipo: 'radiador', pared: 0, posicion: 100, ancho: 60, alto: 60, fondo: 10, alturaSuelo: 10 },
        { id: 'c', tipo: 'columna', centro: { x: 200, y: 200 }, ancho: 30, fondo: 30, rotacion: 0 },
      ],
    }))
    almacen.getState().irAPaso(1)
    const { container } = render(<Lienzo />)
    act(() => almacen.getState().seleccionar({ tipo: 'estructura', id: 'r' }))
    expect([...container.querySelectorAll('[data-cota-en-pared] text')].map((t) => t.textContent)).toEqual(['100 cm', '240 cm'])
    act(() => almacen.getState().seleccionar({ tipo: 'estructura', id: 'c' }))
    expect(container.querySelector('[data-cota-en-pared]')).toBeNull()
  })

  it('al arrastrarla se actualizan', () => {
    almacen.getState().cambiar((d) => ({ ...d, aberturas: [{ ...puerta, ancho: 82 }] }))
    almacen.getState().irAPaso(1)
    const { container } = render(<Lienzo />)
    const vano = pieza(container, '[data-abertura="p"] polygon')
    fireEvent.pointerDown(vano, { pointerId: 1, clientX: 90, clientY: -5 })
    fireEvent.pointerMove(vano, { pointerId: 1, clientX: 150.4, clientY: 40 })
    const textos = [...container.querySelectorAll('[data-cota-en-pared] text')].map((t) => t.textContent)
    expect(textos).toEqual(['110 cm', '208 cm'])
    fireEvent.pointerUp(vano, { pointerId: 1 })
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

describe('Lienzo: paso 2', () => {
  const pieza = (container: HTMLElement, selector: string) => {
    const n = container.querySelector(selector)
    if (!n) throw new Error(`sin ${selector}`)
    return n
  }
  const armario = () => almacen.getState().documento!.elementos.find((e) => e.id === 'a')!

  it('arrastrar un mueble lo mueve, muestra sus cotas mientras tanto y se deshace de una vez', () => {
    colocar('armario', 'a', { x: 200, y: 165 })
    const { container } = render(<Lienzo />)
    const huella = pieza(container, '[data-elemento="a"] polygon')
    fireEvent.pointerDown(huella, { pointerId: 1, clientX: 200, clientY: 165 })
    expect(almacen.getState().seleccion).toEqual({ tipo: 'elemento', id: 'a' })
    fireEvent.pointerMove(huella, { pointerId: 1, clientX: 215, clientY: 170 })
    fireEvent.pointerMove(huella, { pointerId: 1, clientX: 230.4, clientY: 180 })
    expect(armario().posicion).toEqual({ x: 230, y: 180 })
    // Armario de 100 × 60 en (230, 180): 180 cm a la izquierda, 150 por arriba.
    const cotas = [...container.querySelectorAll('[data-cota-elemento]')].map((n) => n.textContent)
    expect(cotas.sort()).toEqual(['120 cm', '120 cm', '150 cm', '180 cm'])
    fireEvent.pointerUp(huella, { pointerId: 1 })
    expect(container.querySelector('[data-cota-elemento]')).toBeNull()
    expect(almacen.getState().grupo).toBeNull()
    almacen.getState().deshacer()
    expect(armario().posicion).toEqual({ x: 200, y: 165 })
  })

  it('cerca de una pared el mueble se pega y la pared se resalta', () => {
    colocar('armario', 'a', { x: 200, y: 165 })
    const { container } = render(<Lienzo />)
    const huella = pieza(container, '[data-elemento="a"] polygon')
    fireEvent.pointerDown(huella, { pointerId: 1, clientX: 200, clientY: 165 })
    fireEvent.pointerMove(huella, { pointerId: 1, clientX: 200, clientY: 45 })
    expect(armario().posicion).toEqual({ x: 200, y: 30 })
    expect(container.querySelector('[data-pared-pegada="0"]')).not.toBeNull()
    fireEvent.pointerUp(huella, { pointerId: 1 })
    expect(container.querySelector('[data-pared-pegada]')).toBeNull()
  })

  it('el tirador de giro gira de 90° en 90° y, con Mayúsculas, libre', () => {
    colocar('armario', 'a', { x: 200, y: 165 })
    almacen.getState().seleccionar({ tipo: 'elemento', id: 'a' })
    const { container } = render(<Lienzo />)
    const tirador = pieza(container, '[data-giro]')
    // 30 cm por delante del frente: 165 + 30 + 30.
    expect([tirador.getAttribute('cx'), tirador.getAttribute('cy')]).toEqual(['200', '225'])
    fireEvent.pointerDown(tirador, { pointerId: 1, clientX: 200, clientY: 225 })
    fireEvent.pointerMove(tirador, { pointerId: 1, clientX: 110, clientY: 180 })
    expect(armario().rotacion).toBe(90)
    fireEvent.pointerMove(tirador, { pointerId: 1, clientX: 100, clientY: 265, shiftKey: true })
    expect(armario().rotacion).toBe(45)
    fireEvent.pointerUp(tirador, { pointerId: 1 })
    expect(almacen.getState().grupo).toBeNull()
    almacen.getState().deshacer()
    expect(armario().rotacion).toBe(0)
  })

  it('el tirador de un mueble contra la pared se dibuja detrás y arrastrarlo no lo voltea', () => {
    colocar('armario', 'a', { x: 200, y: 300 })
    almacen.getState().seleccionar({ tipo: 'elemento', id: 'a' })
    const { container } = render(<Lienzo />)
    const tirador = pieza(container, '[data-giro]')
    // Delante caería en y = 360, fuera de los 330 de la estancia: pasa detrás (300 - 30 - 30).
    expect([tirador.getAttribute('cx'), tirador.getAttribute('cy')]).toEqual(['200', '240'])
    fireEvent.pointerDown(tirador, { pointerId: 1, clientX: 200, clientY: 240 })
    fireEvent.pointerMove(tirador, { pointerId: 1, clientX: 210, clientY: 240 })
    expect(armario().rotacion).toBe(0)
    fireEvent.pointerMove(tirador, { pointerId: 1, clientX: 300, clientY: 300 })
    expect(armario().rotacion).toBe(90)
    fireEvent.pointerUp(tirador, { pointerId: 1 })
  })

  it('el tirador no cambia de lado mientras se arrastra, aunque el frente quede libre al girar, y vuelve a elegir al soltar', () => {
    colocar('armario', 'a', { x: 200, y: 300 })
    almacen.getState().seleccionar({ tipo: 'elemento', id: 'a' })
    const { container } = render(<Lienzo />)
    const sitio = () => {
      const t = pieza(container, '[data-giro]')
      return [Number(t.getAttribute('cx')), Number(t.getAttribute('cy'))]
    }
    const distancia = armario().medidas.fondo / 2 + 30
    expect(sitio()).toEqual([200, 300 - distancia])
    fireEvent.pointerDown(pieza(container, '[data-giro]'), { pointerId: 1, clientX: 200, clientY: 300 - distancia })
    fireEvent.pointerMove(pieza(container, '[data-giro]'), { pointerId: 1, clientX: 300, clientY: 300 })
    expect(armario().rotacion).toBe(90)
    // Con el armario a 90° su frente (hacia -x) cae dentro, pero el tirador sigue detrás: a +x.
    expect(sitio()).toEqual([200 + distancia, 300])
    fireEvent.pointerUp(pieza(container, '[data-giro]'), { pointerId: 1 })
    // Soltado, vuelve a preferir el frente.
    expect(sitio()).toEqual([200 - distancia, 300])
  })

  it('soltar un tipo del catálogo lo añade en ese punto y lo selecciona', () => {
    const { container } = render(<Lienzo />)
    const svg = pieza(container, 'svg')
    const suelta = createEvent.drop(svg, { dataTransfer: { getData: (m: string) => (m === 'application/x-decorazon-tipo' ? 'cama' : ''), types: ['application/x-decorazon-tipo'] } })
    Object.defineProperty(suelta, 'clientX', { value: 200 })
    Object.defineProperty(suelta, 'clientY', { value: 165 })
    fireEvent(svg, suelta)
    const { documento, seleccion } = almacen.getState()
    expect(documento!.elementos).toHaveLength(1)
    expect(documento!.elementos[0]).toMatchObject({ tipo: 'cama', posicion: { x: 200, y: 165 } })
    expect(seleccion).toEqual({ tipo: 'elemento', id: documento!.elementos[0]!.id })
  })
})

describe('Lienzo: paso 2, giro al mover', () => {
  it.each([45, 90])('un armario a %i° movido conserva su giro', (giro) => {
    colocar('armario', 'a', { x: 200, y: 165 })
    almacen.getState().cambiar((d) => ({ ...d, elementos: d.elementos.map((e) => ({ ...e, rotacion: giro })) }))
    const { container } = render(<Lienzo />)
    const huella = container.querySelector('[data-elemento="a"] polygon')
    if (!huella) throw new Error('sin huella')
    fireEvent.pointerDown(huella, { pointerId: 1, clientX: 200, clientY: 165 })
    fireEvent.pointerMove(huella, { pointerId: 1, clientX: 210, clientY: 170 })
    fireEvent.pointerUp(huella, { pointerId: 1 })
    const a = almacen.getState().documento!.elementos[0]!
    expect(a.rotacion).toBe(giro)
    expect(a.posicion).toEqual({ x: 210, y: 170 })
  })
})

describe('Lienzo: solo el botón principal toma las piezas', () => {
  const pieza = (container: HTMLElement, selector: string) => {
    const n = container.querySelector(selector)
    if (!n) throw new Error(`sin ${selector}`)
    return n
  }
  const transformacion = (container: HTMLElement) => pieza(container, 'svg > g').getAttribute('transform')

  it('el botón central sobre un mueble no lo toma: el lienzo hace pan', () => {
    colocar('armario', 'a', { x: 200, y: 165 })
    const { container } = render(<Lienzo />)
    const huella = pieza(container, '[data-elemento="a"] polygon')
    fireEvent.pointerDown(huella, { pointerId: 1, button: 1, clientX: 200, clientY: 165 })
    fireEvent.pointerMove(huella, { pointerId: 1, button: 1, clientX: 220, clientY: 175 })
    fireEvent.pointerUp(huella, { pointerId: 1, button: 1, clientX: 220, clientY: 175 })
    expect(almacen.getState().seleccion).toBeNull()
    expect(almacen.getState().documento!.elementos[0]!.posicion).toEqual({ x: 200, y: 165 })
    expect(transformacion(container)).toBe('translate(20 10) scale(1)')
  })

  it('el botón derecho no toma un mueble, ni una columna, ni un vértice, ni el tirador de giro', () => {
    colocar('armario', 'a', { x: 200, y: 165 })
    almacen.getState().seleccionar({ tipo: 'elemento', id: 'a' })
    const { container, rerender } = render(<Lienzo />)
    const derecho = (n: Element, x: number, y: number) => {
      fireEvent.pointerDown(n, { pointerId: 1, button: 2, clientX: x, clientY: y })
      fireEvent.pointerMove(n, { pointerId: 1, button: 2, clientX: x + 30, clientY: y + 20 })
      fireEvent.pointerUp(n, { pointerId: 1, button: 2, clientX: x + 30, clientY: y + 20 })
    }
    derecho(pieza(container, '[data-giro]'), 200, 225)
    derecho(pieza(container, '[data-elemento="a"] polygon'), 200, 165)
    expect(almacen.getState().documento!.elementos[0]).toMatchObject({ posicion: { x: 200, y: 165 }, rotacion: 0 })

    almacen.getState().cambiar((d) => ({ ...d, estructura: [{ id: 'col', tipo: 'columna', centro: { x: 100, y: 100 }, ancho: 30, fondo: 30, rotacion: 0 }] }))
    almacen.getState().irAPaso(1)
    almacen.getState().seleccionar(null)
    rerender(<Lienzo />)
    derecho(pieza(container, '[data-estructura="col"] polygon'), 100, 100)
    derecho(pieza(container, '[data-vertice="2"]'), 400, 330)
    const d = almacen.getState().documento!
    expect(d.estructura[0]).toMatchObject({ centro: { x: 100, y: 100 } })
    expect(d.estancia.planta[2]).toEqual({ x: 400, y: 330 })
    expect(almacen.getState().seleccion).toBeNull()
  })
})

describe('Lienzo con los dedos', () => {
  const svgDe = (container: HTMLElement) => container.querySelector('svg')!
  const vistaDe = (container: HTMLElement) => {
    const [x, y, escala] = container.querySelector('svg > g')!.getAttribute('transform')!.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g)!.map(Number)
    return { x: x!, y: y!, escala: escala! }
  }

  it('pellizcar el fondo amplía alrededor del punto medio; el dedo que queda no desplaza ni anula la selección', () => {
    colocar('armario', 'a', { x: 80, y: 50 })
    almacen.getState().seleccionar({ tipo: 'elemento', id: 'a' })
    const { container } = render(<Lienzo />)
    const svg = svgDe(container)
    fireEvent.pointerDown(svg, { pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerDown(svg, { pointerId: 2, clientX: 200, clientY: 100 })
    fireEvent.pointerMove(svg, { pointerId: 2, clientX: 300, clientY: 100 })
    expect(vistaDe(container)).toEqual({ x: -100, y: -100, escala: 2 })
    fireEvent.pointerUp(svg, { pointerId: 2, clientX: 300, clientY: 100 })
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 150, clientY: 150 })
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 150, clientY: 150 })
    expect(vistaDe(container)).toEqual({ x: -100, y: -100, escala: 2 })
    expect(almacen.getState().seleccion).toEqual({ tipo: 'elemento', id: 'a' })
  })

  it('el segundo dedo corta el arrastre del mueble que tocaba el primero y pasa a pellizco', () => {
    colocar('armario', 'a', { x: 80, y: 50 })
    const { container } = render(<Lienzo />)
    const huella = container.querySelector('[data-elemento="a"] polygon')!
    fireEvent.pointerDown(huella, { pointerId: 1, clientX: 80, clientY: 50 })
    expect(hayArrastre()).toBe(true)
    fireEvent.pointerDown(svgDe(container), { pointerId: 2, clientX: 180, clientY: 50 })
    expect(hayArrastre()).toBe(false)
    fireEvent.pointerMove(huella, { pointerId: 1, clientX: 60, clientY: 50 })
    expect(almacen.getState().documento!.elementos[0]!.posicion).toEqual({ x: 80, y: 50 })
    const v = vistaDe(container)
    expect(v.escala).toBeCloseTo(1.2)
    expect(v.x).toBeCloseTo(-36)
    expect(v.y).toBeCloseTo(-10)
  })

  it('al cambiar de tamaño se vuelve a encuadrar; si se ha movido a mano, se conserva el centro', () => {
    let avisar = () => {}
    const original = globalThis.ResizeObserver
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) { avisar = () => cb([], this as unknown as ResizeObserver) }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    let tam = { width: 800, height: 600 }
    const espia = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ x: 0, y: 0, left: 0, top: 0, right: tam.width, bottom: tam.height, width: tam.width, height: tam.height, toJSON: () => ({}) }) as DOMRect,
    )
    try {
      const { estancia } = almacen.getState().documento!
      const esperada = (w: number, h: number) => encuadrar(desplazarPoligono(estancia.planta, estancia.grosorPared), w, h)
      const { container } = render(<Lienzo />)
      expect(vistaDe(container)).toEqual(esperada(800, 600))

      tam = { width: 390, height: 300 }
      act(() => avisar())
      expect(vistaDe(container)).toEqual(esperada(390, 300))

      const svg = svgDe(container)
      fireEvent.pointerDown(svg, { pointerId: 1, clientX: 5, clientY: 5 })
      fireEvent.pointerMove(svg, { pointerId: 1, clientX: 25, clientY: 5 })
      fireEvent.pointerUp(svg, { pointerId: 1, clientX: 25, clientY: 5 })
      const movida = vistaDe(container)
      tam = { width: 390, height: 600 }
      act(() => avisar())
      expect(vistaDe(container)).toEqual({ ...movida, y: movida.y + 150 })
    } finally {
      espia.mockRestore()
      globalThis.ResizeObserver = original
    }
  })
})
