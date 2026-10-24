import { penetracion } from './convexo'
import type { Punto } from './vector'

/** Volumen: huella convexa en planta extruida entre zMin y zMax (cm). */
export interface Prisma {
  huella: Punto[]
  zMin: number
  zMax: number
}

/** Solape vertical: positivo si los rangos z se cruzan, ≤ 0 si están separados o se tocan. */
export function solapeZ(a: Prisma, b: Prisma): number {
  return Math.min(a.zMax, b.zMax) - Math.max(a.zMin, b.zMin)
}

/** Penetración 3D: mínimo entre la de las huellas y el solape en z. ≤ TOLERANCIA_CM = no chocan. */
export function penetracion3D(a: Prisma, b: Prisma): number {
  return Math.min(penetracion(a.huella, b.huella), solapeZ(a, b))
}
