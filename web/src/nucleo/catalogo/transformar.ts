import type { Elemento } from '../modelo/documento'
import { rotar, sumar, type Punto } from '../geometria/vector'
import type { Prisma } from '../geometria/prisma'

/** Punto local (relativo al centro de la huella) a coordenadas del mundo. */
export function aMundo(e: Elemento, local: Punto): Punto {
  return sumar(e.posicion, rotar(local, e.rotacion))
}

/** Caja en coordenadas locales (x0<x1, y0<y1); z relativa a `e.alturaSuelo`. */
export function cajaMundo(e: Elemento, x0: number, y0: number, x1: number, y1: number, zMin: number, zMax: number): Prisma {
  const huella = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }].map((p) => aMundo(e, p))
  return { huella, zMin: e.alturaSuelo + zMin, zMax: e.alturaSuelo + zMax }
}
