import { distanciaSegmentos } from './poligono'
import { longitud, normalizar, punto, restar, type Punto } from './vector'

function proyeccion(p: Punto[], eje: Punto): [number, number] {
  let min = Infinity, max = -Infinity
  for (const v of p) {
    const d = punto(v, eje)
    if (d < min) min = d
    if (d > max) max = d
  }
  return [min, max]
}

/**
 * Profundidad de penetración por SAT: la menor traslación, sobre los ejes de separación, que separa las dos
 * huellas (<= 0 si están separadas o se tocan). Por eje, min(maxA - minB, maxB - minA), que también cuenta bien
 * la contención (una caja dentro de otra). Vale con cualquier sentido de vértices.
 */
export function penetracion(a: Punto[], b: Punto[]): number {
  let minimo = Infinity
  for (const poli of [a, b]) {
    for (let i = 0; i < poli.length; i++) {
      const arista = restar(poli[(i + 1) % poli.length], poli[i])
      if (longitud(arista) === 0) continue
      const eje = normalizar({ x: -arista.y, y: arista.x })
      const [minA, maxA] = proyeccion(a, eje)
      const [minB, maxB] = proyeccion(b, eje)
      minimo = Math.min(minimo, maxA - minB, maxB - minA)
    }
  }
  return minimo === Infinity ? 0 : minimo
}

/** 0 si se solapan o se tocan; si no, la distancia mínima entre bordes. */
export function distanciaConvexos(a: Punto[], b: Punto[]): number {
  if (penetracion(a, b) > 0) return 0
  let d = Infinity
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      d = Math.min(d, distanciaSegmentos(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length]))
    }
  }
  return d
}
