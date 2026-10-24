import { describe, expect, it } from 'vitest'
import { armario } from './armario'
import { elementoDe } from './ayuda.test-util'

const xs = (h: { x: number }[]) => h.map((p) => p.x)
const ys = (h: { y: number }[]) => h.map((p) => p.y)

describe('armario', () => {
  it('2 puertas abatibles delante, radio 50, x 50–150', () => {
    const zonas = armario.zonasApertura(elementoDe('armario', 100, 100, 0, 100, 60, 220))
    expect(zonas).toHaveLength(2)
    for (const z of zonas) {
      expect(z.nombre).toBe('la puerta')
      expect(Math.min(...ys(z.huella))).toBeGreaterThanOrEqual(130 - 1e-9)
      expect(Math.max(...ys(z.huella))).toBeGreaterThan(179)
      expect(Math.max(...ys(z.huella))).toBeLessThan(180.5)
      expect(z.zMin).toBe(0)
      expect(z.zMax).toBe(220)
    }
    const todas = zonas.flatMap((z) => xs(z.huella))
    expect(Math.min(...todas)).toBeGreaterThanOrEqual(50 - 1e-9)
    expect(Math.min(...todas)).toBeLessThan(50.5)
    expect(Math.max(...todas)).toBeLessThan(150.5)
    expect(Math.max(...todas)).toBeGreaterThan(149)
  })
  it('rotado 90° las zonas quedan en x ≤ 70', () => {
    const zonas = armario.zonasApertura(elementoDe('armario', 100, 100, 90, 100, 60, 220))
    expect(zonas).toHaveLength(2)
    for (const z of zonas) expect(Math.max(...xs(z.huella))).toBeLessThanOrEqual(70 + 1e-9)
  })
  it('correderas: sin zonas', () => {
    expect(armario.zonasApertura(elementoDe('armario', 100, 100, 0, 100, 60, 220, { puertas: 'correderas' }))).toHaveLength(0)
  })
  it('modulos 2: 4 puertas', () => {
    expect(armario.zonasApertura(elementoDe('armario', 0, 0, 0, 200, 60, 220, { modulos: 2 }))).toHaveLength(4)
  })
})
