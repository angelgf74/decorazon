import { describe, expect, it } from 'vitest'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { elemento } from './ayuda.test-util'
import { silla } from './silla'

type Caja = Extract<PiezaLocal, { forma: 'caja' }>
const cajas = (medidas = {}) => silla.modelo3d!(elemento('silla', 0, 0, 0, medidas)).filter((p): p is Caja => p.forma === 'caja')

describe('silla: respaldo con montantes y panel flotante', () => {
  it('45 × 50 × 85: 4 patas, asiento redondeado, dos montantes de 4 × 3 desde el asiento hasta arriba y un panel de 22 con radio', () => {
    const ps = cajas()
    expect(ps).toHaveLength(8)
    const asiento = ps.find((p) => p.z0 === 42 && p.z1 === 45)!
    expect(asiento.radio).toBe(1)
    const montantes = ps.filter((p) => p.z0 === 45 && p.z1 === 85)
    expect(montantes).toHaveLength(2)
    for (const m of montantes) {
      expect(m.x1 - m.x0).toBe(4)
      expect(m.y1 - m.y0).toBe(3)
      expect(m.y0).toBe(-25)
    }
    expect(montantes.map((m) => m.x0).sort((a, b) => a - b)).toEqual([-22.5, 18.5])
    const panel = ps.find((p) => p.z1 === 82)!
    expect(panel).toMatchObject({ z0: 60, x0: -18.5, x1: 18.5, radio: 1 })
  })

  it('el panel deja al menos 5 cm de hueco sobre el asiento con cualquier alto', () => {
    for (const alto of [75, 85, 110]) {
      const panel = cajas({ alto }).find((p) => p.z1 === alto - 3)!
      expect(panel.z0 - 45).toBeGreaterThanOrEqual(5)
    }
  })
})
