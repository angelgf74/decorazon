import { describe, expect, it } from 'vitest'
import { rectangulo } from '../geometria/formas'
import { documentoNuevo } from '../modelo/crear'
import { cotasAParedes, cotasEnPared } from './cotas'

const planta = documentoNuevo('dormitorio', 400, 330, 250).estancia.planta

describe('cotasAParedes', () => {
  it('da la distancia a la pared por cada lado: arriba, derecha, abajo, izquierda', () => {
    const cotas = cotasAParedes(planta, rectangulo({ x: 100, y: 100 }, 100, 60, 0))
    expect(cotas.map(c => c.valor)).toEqual([70, 250, 200, 50])
    expect(cotas[0].desde).toEqual({ x: 100, y: 70 })
    expect(cotas[0].hasta).toEqual({ x: 100, y: 0 })
  })
  it('omite el lado pegado a la pared', () => {
    const cotas = cotasAParedes(planta, rectangulo({ x: 100, y: 30 }, 100, 60, 0))
    expect(cotas.map(c => c.valor)).toEqual([250, 270, 50])
  })
  it('redondea hacia abajo', () => {
    const cotas = cotasAParedes(planta, rectangulo({ x: 100.7, y: 100 }, 100, 60, 0))
    expect(cotas.map(c => c.valor)).toEqual([70, 249, 200, 50])
  })
  it('en una planta en U omite el lado a ras del entrante en vez de cruzar al otro brazo', () => {
    const u = [
      { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 200 }, { x: 200, y: 200 }, { x: 200, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 300 }, { x: 0, y: 300 },
    ]
    const cotas = cotasAParedes(u, rectangulo({ x: 70, y: 100 }, 60, 40, 0))
    expect(cotas.map(c => c.valor)).toEqual([80, 180, 40])
    expect(cotas.every(c => c.hasta.x <= 100)).toBe(true)
  })
  it('en una planta en L toma el primer tramo que corta', () => {
    const ele = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 100 }, { x: 100, y: 100 }, { x: 100, y: 300 }, { x: 0, y: 300 }]
    const cotas = cotasAParedes(ele, rectangulo({ x: 50, y: 200 }, 40, 40, 0))
    expect(cotas.map(c => c.valor)).toEqual([180, 30, 80, 30])
  })
})

describe('cotasEnPared', () => {
  it('puerta de 82 a 50 cm del inicio en una pared de 400 da 50 y 268', () => {
    const cotas = cotasEnPared(planta, 0, 50, 82)
    expect(cotas.map(c => c.valor)).toEqual([50, 268])
    expect(cotas[0]).toEqual({ desde: { x: 0, y: 0 }, hasta: { x: 50, y: 0 }, valor: 50 })
    expect(cotas[1]).toEqual({ desde: { x: 132, y: 0 }, hasta: { x: 400, y: 0 }, valor: 268 })
  })
  it('una puerta pegada al inicio da una sola cota', () => {
    expect(cotasEnPared(planta, 0, 0, 82).map(c => c.valor)).toEqual([318])
  })
})
