import { describe, expect, it } from 'vitest'
import { areaConSigno, contienePunto } from './poligono'
import { rectangulo, sectorCircunscrito } from './formas'
import { TOLERANCIA_CM } from './tolerancia'
import { longitud, restar } from './vector'

describe('rectangulo', () => {
  it('es horario en pantalla (área positiva)', () => {
    expect(areaConSigno(rectangulo({ x: 0, y: 0 }, 100, 60, 0))).toBeCloseTo(6000, 6)
    expect(areaConSigno(rectangulo({ x: 5, y: 7 }, 100, 60, 90))).toBeCloseTo(6000, 6)
  })
  it('rota 90° en horario: la esquina (-w/2,-f/2) pasa a (f/2,-w/2)', () => {
    const r = rectangulo({ x: 0, y: 0 }, 100, 60, 90)
    expect(r[0].x).toBeCloseTo(30, 9)
    expect(r[0].y).toBeCloseTo(-50, 9)
  })
})

describe('sectorCircunscrito', () => {
  const o = { x: 10, y: 20 }
  const s = sectorCircunscrito(o, 50, 0, 90)
  it('contiene todos los puntos del arco real', () => {
    for (let i = 0; i <= 100; i++) {
      const a = (i / 100) * (Math.PI / 2)
      expect(contienePunto(s, { x: o.x + 50 * Math.cos(a), y: o.y + 50 * Math.sin(a) })).toBe(true)
    }
  })
  it('ningún vértice excede el radio más la tolerancia', () => {
    for (const p of s) expect(longitud(restar(p, o))).toBeLessThanOrEqual(50 + TOLERANCIA_CM)
  })
  it('empieza en el centro y tiene segmentos + 2 vértices', () => {
    // Radio 50, 90°: con 16 segmentos la holgura es 50·(1/cos(2.8125°) − 1) = 0.060 > 0.05; con 17, 0.053;
    // con 18 (paso 5°), 50·(1/cos(2.5°) − 1) = 0.048 -> 18 segmentos, 20 vértices.
    expect(s[0]).toEqual(o)
    expect(s).toHaveLength(20)
    expect(sectorCircunscrito(o, 50, 0, 90, 16)).toHaveLength(18)
  })
  it('radio 200, 90°: ningún vértice a más de 200.05 del centro', () => {
    const grande = sectorCircunscrito(o, 200, 0, 90)
    for (const p of grande) expect(longitud(restar(p, o))).toBeLessThanOrEqual(200.05)
    // 200·(1/cos(paso/2) − 1) <= 0.05 pide paso <= 2.5626° -> 36 segmentos (paso 2.5°), 38 vértices.
    expect(grande).toHaveLength(38)
  })
  it('radio pequeño: al menos 16 segmentos', () => {
    expect(sectorCircunscrito(o, 10, 0, 90)).toHaveLength(18)
  })
})

describe('sectorCircunscrito: argumentos inválidos', () => {
  const o = { x: 0, y: 0 }
  it('segmentos < 1', () => {
    expect(() => sectorCircunscrito(o, 50, 0, 90, 0)).toThrow(RangeError)
  })
  it('span 0', () => {
    expect(() => sectorCircunscrito(o, 50, 30, 30)).toThrow(RangeError)
  })
  it('span > 180', () => {
    expect(() => sectorCircunscrito(o, 50, 0, 181)).toThrow(RangeError)
  })
  it('paso >= 90', () => {
    expect(() => sectorCircunscrito(o, 50, 0, 180, 2)).toThrow(RangeError)
  })
})
