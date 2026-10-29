import { describe, expect, it } from 'vitest'
import { rectangulo } from '../geometria/formas'
import { documentoNuevo } from '../modelo/crear'
import { cotasAParedes } from './cotas'

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
  it('en una planta en L toma el primer tramo que corta', () => {
    const ele = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 100 }, { x: 100, y: 100 }, { x: 100, y: 300 }, { x: 0, y: 300 }]
    const cotas = cotasAParedes(ele, rectangulo({ x: 50, y: 200 }, 40, 40, 0))
    expect(cotas.map(c => c.valor)).toEqual([180, 30, 80, 30])
  })
})
