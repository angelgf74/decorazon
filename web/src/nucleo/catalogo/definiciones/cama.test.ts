import { describe, expect, it } from 'vitest'
import { cama } from './cama'
import { alfombra } from './alfombra'
import { elementoDe } from './ayuda.test-util'

describe('cama', () => {
  it('con cabecero: 2 volúmenes, el más alto llega a 100', () => {
    const v = cama.volumenes(elementoDe('cama', 100, 100, 0, 150, 200, 45, { cabecero: true }))
    expect(v).toHaveLength(2)
    expect(Math.max(...v.map((p) => p.zMax))).toBe(100)
  })
  it('sin cabecero: 1 volumen; por defecto lleva cabecero', () => {
    expect(cama.volumenes(elementoDe('cama', 0, 0, 0, 150, 200, 45, { cabecero: false }))).toHaveLength(1)
    expect(cama.volumenes(elementoDe('cama', 0, 0, 0, 150, 200, 45))).toHaveLength(2)
  })
  it('cabecero en la trasera (y local negativo)', () => {
    const [, c] = cama.volumenes(elementoDe('cama', 100, 100, 0, 150, 200, 45))
    const ys = c.huella.map((p) => p.y)
    expect(Math.min(...ys)).toBeCloseTo(0, 9)
    expect(Math.max(...ys)).toBeCloseTo(6, 9)
  })
})
describe('alfombra', () => {
  it('es pisable y no bloquea el paso', () => {
    expect(alfombra.pisable).toBe(true)
    expect(alfombra.bloqueaPaso).toBe(false)
    expect(alfombra.zonasApertura(elementoDe('alfombra', 0, 0, 0, 200, 140, 1))).toHaveLength(0)
  })
})
