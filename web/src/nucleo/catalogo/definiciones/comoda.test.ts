import { describe, expect, it } from 'vitest'
import { comoda } from './comoda'
import { elementoDe } from './ayuda.test-util'

describe('cómoda', () => {
  it('zona de cajón de 45 de fondo pegada al frente', () => {
    const [z] = comoda.zonasApertura(elementoDe('comoda', 100, 100, 0, 100, 50, 85))
    expect(z.nombre).toBe('el cajón')
    const ys = z.huella.map((p) => p.y)
    expect(Math.min(...ys)).toBeCloseTo(125, 9)
    expect(Math.max(...ys)).toBeCloseTo(170, 9)
    expect(z.zMax).toBe(85)
  })
})
