import { describe, expect, it } from 'vitest'
import { aPantalla, aPlano, encuadrar, ESCALA_MAX, zoomEn } from './vista'

const planta = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 330 }, { x: 0, y: 330 }]

describe('vista', () => {
  it('encuadrar centra la caja de la planta', () => {
    const v = encuadrar(planta, 800, 600, 48)
    const c = aPantalla(v, { x: 200, y: 165 })
    expect(c.x).toBeCloseTo(400)
    expect(c.y).toBeCloseTo(300)
    expect(v.escala).toBeCloseTo(504 / 330)
  })

  it('aPlano deshace aPantalla', () => {
    const v = { x: 37, y: -12, escala: 1.7 }
    const p = { x: 123.4, y: -56.7 }
    const q = aPlano(v, aPantalla(v, p))
    expect(q.x).toBeCloseTo(p.x)
    expect(q.y).toBeCloseTo(p.y)
  })

  it('zoomEn deja quieto el punto bajo el cursor', () => {
    const v = encuadrar(planta, 800, 600)
    const px = { x: 250, y: 410 }
    const v2 = zoomEn(v, 2, px)
    expect(v2.escala).toBeCloseTo(v.escala * 2)
    expect(aPlano(v2, px).x).toBeCloseTo(aPlano(v, px).x)
    expect(aPlano(v2, px).y).toBeCloseTo(aPlano(v, px).y)
  })

  it('zoomEn recorta la escala', () => {
    expect(zoomEn({ x: 0, y: 0, escala: 1 }, 1e6, { x: 10, y: 10 }).escala).toBe(ESCALA_MAX)
  })
})
