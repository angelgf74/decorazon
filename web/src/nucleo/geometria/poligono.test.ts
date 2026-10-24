import { describe, expect, it } from 'vitest'
import { areaConSigno, contienePunto, distanciaAlBorde, distanciaPuntoSegmento, distanciaSegmentos, esSimple } from './poligono'

const sala = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 330 }, { x: 0, y: 330 }]

describe('poligono', () => {
  it('área con signo: horario en pantalla es positiva', () => {
    expect(areaConSigno(sala)).toBe(132000)
    expect(areaConSigno([...sala].reverse())).toBe(-132000)
  })
  it('esSimple', () => {
    const pajarita = [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 100, y: 0 }, { x: 0, y: 100 }]
    const ele = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 100 }, { x: 100, y: 100 }, { x: 100, y: 300 }, { x: 0, y: 300 }]
    expect(esSimple(pajarita)).toBe(false)
    expect(esSimple(ele)).toBe(true)
    expect(esSimple(sala)).toBe(true)
  })
  it('contienePunto: dentro, fuera y borde', () => {
    expect(contienePunto(sala, { x: 200, y: 100 })).toBe(true)
    expect(contienePunto(sala, { x: 401, y: 100 })).toBe(false)
    expect(contienePunto(sala, { x: 400, y: 100 })).toBe(true)
    expect(contienePunto(sala, { x: 0, y: 0 })).toBe(true)
  })
  it('distancias', () => {
    expect(distanciaPuntoSegmento({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(3)
    expect(distanciaPuntoSegmento({ x: 13, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5)
    expect(distanciaAlBorde(sala, { x: 100, y: 30 })).toBe(30)
    expect(distanciaSegmentos({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 })).toBe(0)
    expect(distanciaSegmentos({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 })).toBe(5)
  })
})
