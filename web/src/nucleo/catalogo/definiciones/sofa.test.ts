import { describe, expect, it } from 'vitest'
import { sofa } from './sofa'
import { elementoDe } from './ayuda.test-util'

describe('sofá', () => {
  it('sin chaise, 1 volumen', () => {
    expect(sofa.volumenes(elementoDe('sofa', 0, 0, 0, 200, 90, 85))).toHaveLength(1)
    expect(sofa.volumenes(elementoDe('sofa', 0, 0, 0, 200, 90, 85, { chaise: 'no' }))).toHaveLength(1)
  })
  it('chaise izquierda: 2 volúmenes, el segundo de x mínima -ancho/2 y hasta y = fondo/2 + 70', () => {
    const [caja, chaise] = sofa.volumenes(elementoDe('sofa', 0, 0, 0, 200, 90, 85, { chaise: 'izquierda' }))
    expect(caja.zMax).toBe(85)
    expect(Math.min(...chaise.huella.map((p) => p.x))).toBeCloseTo(-100, 9)
    expect(Math.max(...chaise.huella.map((p) => p.x))).toBeCloseTo(-10, 9)
    expect(Math.max(...chaise.huella.map((p) => p.y))).toBeCloseTo(115, 9)
    expect(Math.min(...chaise.huella.map((p) => p.y))).toBeCloseTo(-45, 9)
    expect(chaise.zMin).toBe(0)
    expect(chaise.zMax).toBe(45)
  })
  it('chaise derecha en +x y de ancho min(90, ancho/2)', () => {
    const [, chaise] = sofa.volumenes(elementoDe('sofa', 0, 0, 0, 140, 90, 85, { chaise: 'derecha' }))
    expect(Math.max(...chaise.huella.map((p) => p.x))).toBeCloseTo(70, 9)
    expect(Math.min(...chaise.huella.map((p) => p.x))).toBeCloseTo(0, 9)
  })
})
