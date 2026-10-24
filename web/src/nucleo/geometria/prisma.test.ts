import { describe, expect, it } from 'vitest'
import { penetracion3D, solapeZ, type Prisma } from './prisma'
import { rectangulo } from './formas'

const huella = (x: number) => rectangulo({ x, y: 0 }, 100, 60, 0)
const prisma = (x: number, zMin: number, zMax: number): Prisma => ({ huella: huella(x), zMin, zMax })

describe('prisma', () => {
  it('módulo alto sobre módulo bajo con la misma huella no choca', () => {
    expect(penetracion3D(prisma(0, 140, 210), prisma(0, 0, 85))).toBeLessThanOrEqual(0)
  })
  it('armario contra viga con huellas solapadas 30 -> 10', () => {
    expect(penetracion3D(prisma(0, 0, 240), prisma(70, 230, 250))).toBeCloseTo(10, 9)
  })
  it('huellas separadas no chocan aunque se solape z', () => {
    expect(penetracion3D(prisma(0, 0, 240), prisma(200, 0, 240))).toBeLessThanOrEqual(0)
  })
  it('solapeZ', () => {
    expect(solapeZ(prisma(0, 0, 240), prisma(0, 230, 250))).toBe(10)
  })
})
