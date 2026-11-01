import { describe, expect, it } from 'vitest'
import { catalogoBase } from '../catalogo/catalogoBase'
import { elementoNuevo } from '../catalogo/elemento'
import { documentoNuevo } from '../modelo/crear'
import type { Elemento, Punto } from '../modelo/documento'
import { tiradorDeGiro } from './tiradorDeGiro'

const SEPARACION = 30
const sala = documentoNuevo('dormitorio', 400, 330, 250).estancia.planta
// Armario de 100 × 60.
const armario = (posicion: Punto, rotacion = 0): Elemento => ({ ...elementoNuevo(catalogoBase.get('armario')!, posicion, 'a'), rotacion })
const cerca = (a: Punto, b: Punto) => {
  expect(a.x).toBeCloseTo(b.x, 6)
  expect(a.y).toBeCloseTo(b.y, 6)
}

/** Mismo ángulo que `giroHacia` del lienzo: el que deja el frente mirando desde `centro` hacia `p`. */
const anguloHacia = (centro: Punto, p: Punto) => (Math.atan2(-(p.x - centro.x), p.y - centro.y) * 180) / Math.PI
const modulo360 = (g: number) => ((g % 360) + 360) % 360

describe('tiradorDeGiro', () => {
  it('en el centro de la estancia queda delante', () => {
    const r = tiradorDeGiro(sala, armario({ x: 200, y: 165 }), SEPARACION)
    cerca(r.centro, { x: 200, y: 225 })
    expect(r.desfase).toBe(0)
  })

  it('con el frente contra la pared pasa detrás', () => {
    const r = tiradorDeGiro(sala, armario({ x: 200, y: 300 }), SEPARACION)
    cerca(r.centro, { x: 200, y: 240 })
    expect(r.desfase).toBe(180)
  })

  it('con delante y detrás fuera pasa a la derecha y, si tampoco cabe, a la izquierda', () => {
    // Pasillo de 100 cm con el armario girado 90°: su frente y su trasera dan a las paredes.
    const pasillo = documentoNuevo('dormitorio', 100, 330, 250).estancia.planta
    const derecha = tiradorDeGiro(pasillo, armario({ x: 50, y: 165 }, 90), SEPARACION)
    cerca(derecha.centro, { x: 50, y: 245 })
    expect(derecha.desfase).toBe(-90)
    const izquierda = tiradorDeGiro(pasillo, armario({ x: 50, y: 300 }, 90), SEPARACION)
    cerca(izquierda.centro, { x: 50, y: 220 })
    expect(izquierda.desfase).toBe(90)
  })

  it('en el rincón interior de una L con los cuatro fuera, se queda delante', () => {
    const ele = [{ x: 0, y: 0 }, { x: 70, y: 0 }, { x: 70, y: 35 }, { x: 35, y: 35 }, { x: 35, y: 70 }, { x: 0, y: 70 }]
    const r = tiradorDeGiro(ele, armario({ x: 20, y: 20 }), SEPARACION)
    cerca(r.centro, { x: 20, y: 80 })
    expect(r.desfase).toBe(0)
  })

  it.each([
    ['delante', { x: 200, y: 165 }, 0, sala],
    ['detrás', { x: 200, y: 300 }, 0, sala],
    ['a la derecha', { x: 50, y: 165 }, 90, documentoNuevo('dormitorio', 100, 330, 250).estancia.planta],
    ['a la izquierda', { x: 50, y: 300 }, 90, documentoNuevo('dormitorio', 100, 330, 250).estancia.planta],
  ] as const)('con el puntero sobre el tirador %s, el giro no cambia', (_, posicion, rotacion, planta) => {
    const e = armario(posicion, rotacion)
    const { centro, desfase } = tiradorDeGiro(planta, e, SEPARACION)
    expect(modulo360(anguloHacia(e.posicion, centro) - desfase)).toBeCloseTo(rotacion, 6)
  })
})
