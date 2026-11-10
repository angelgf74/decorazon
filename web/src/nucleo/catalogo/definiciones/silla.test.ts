import { describe, expect, it } from 'vitest'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { cajaDePieza } from '../../modelo3d/formas'
import { elemento } from './ayuda.test-util'
import { silla } from './silla'

type Caja = Extract<PiezaLocal, { forma: 'caja' }>
type Extrusion = Extract<PiezaLocal, { forma: 'extrusion' }>
const piezas = (medidas = {}, variantes = {}) => silla.modelo3d!(elemento('silla', 0, 0, 0, medidas, variantes))
const cajas = (medidas = {}) => piezas(medidas).filter((p): p is Caja => p.forma === 'caja')
const panel = (medidas = {}) => piezas(medidas).find((p): p is Extrusion => p.forma === 'extrusion')!

describe('silla: respaldo con montantes y panel curvo, faldones bajo el asiento', () => {
  it('45 × 50 × 85: 4 patas, asiento redondeado y dos montantes de 4 × 3 desde el asiento hasta arriba', () => {
    const ps = cajas()
    expect(ps.filter((p) => p.z0 === 0)).toHaveLength(4)
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
  })

  it('el panel del respaldo es una extrusión en planta entre los montantes, curvada hacia atrás en el centro y dentro de los 3 cm del respaldo', () => {
    const p = panel()
    expect(p).toMatchObject({ plano: 'planta', desde: 60, hasta: 82, zona: 'asiento' })
    expect(cajaDePieza(p)).toMatchObject({ x0: -18.5, x1: 18.5, y0: -25 })
    expect(cajaDePieza(p).y1).toBeLessThanOrEqual(-22)
    // El centro queda más atrás que los extremos: la curva abraza la espalda.
    const atras = (x: number) => Math.min(...p.contorno.filter(([px]) => Math.abs(px - x) < 1e-9).map(([, y]) => y))
    expect(atras(0)).toBeLessThan(atras(-18.5))
    expect(atras(0)).toBeLessThan(atras(18.5))
  })

  it('el panel deja al menos 5 cm de hueco sobre el asiento con cualquier alto', () => {
    for (const alto of [75, 85, 110]) expect(panel({ alto }).desde - 45).toBeGreaterThanOrEqual(5)
  })

  it('cuatro faldones de 7 cm bajo el asiento unen las patas por dentro de la huella', () => {
    const faldones = cajas().filter((p) => p.z0 === 35 && p.z1 === 42)
    expect(faldones).toHaveLength(4)
    for (const f of faldones) {
      expect(f.x0).toBeGreaterThanOrEqual(-22.5)
      expect(f.x1).toBeLessThanOrEqual(22.5)
      expect(f.y0).toBeGreaterThanOrEqual(-25)
      expect(f.y1).toBeLessThanOrEqual(25)
    }
  })
})
