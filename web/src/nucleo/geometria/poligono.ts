import { cruz, longitud, restar, type Punto } from './vector'

const EPS = 1e-9

/** Área por la fórmula del lazo; positiva si es horaria en pantalla (y hacia abajo). */
export function areaConSigno(p: Punto[]): number {
  let s = 0
  for (let i = 0; i < p.length; i++) s += cruz(p[i], p[(i + 1) % p.length])
  return s / 2
}

export function distanciaPuntoSegmento(q: Punto, a: Punto, b: Punto): number {
  const ab = restar(b, a)
  const l2 = ab.x * ab.x + ab.y * ab.y
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((q.x - a.x) * ab.x + (q.y - a.y) * ab.y) / l2))
  return longitud({ x: q.x - (a.x + t * ab.x), y: q.y - (a.y + t * ab.y) })
}

export function distanciaAlBorde(p: Punto[], q: Punto): number {
  let d = Infinity
  for (let i = 0; i < p.length; i++) d = Math.min(d, distanciaPuntoSegmento(q, p[i], p[(i + 1) % p.length]))
  return d
}

function seCortan(a1: Punto, a2: Punto, b1: Punto, b2: Punto): boolean {
  const d1 = cruz(restar(a2, a1), restar(b1, a1))
  const d2 = cruz(restar(a2, a1), restar(b2, a1))
  const d3 = cruz(restar(b2, b1), restar(a1, b1))
  const d4 = cruz(restar(b2, b1), restar(a2, b1))
  return d1 * d2 < 0 && d3 * d4 < 0
}

export function distanciaSegmentos(a1: Punto, a2: Punto, b1: Punto, b2: Punto): number {
  if (seCortan(a1, a2, b1, b2)) return 0
  return Math.min(
    distanciaPuntoSegmento(a1, b1, b2), distanciaPuntoSegmento(a2, b1, b2),
    distanciaPuntoSegmento(b1, a1, a2), distanciaPuntoSegmento(b2, a1, a2),
  )
}

/** Simple: ningún par de aristas no contiguas se toca ni se cruza. */
export function esSimple(p: Punto[]): boolean {
  const n = p.length
  if (n < 3) return false
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const contiguas = j === i + 1 || (i === 0 && j === n - 1)
      const d = distanciaSegmentos(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n])
      if (contiguas ? false : d < EPS) return false
    }
  }
  // Aristas contiguas que se solapan hacia atrás (vértice espigado de ángulo 0).
  for (let i = 0; i < n; i++) {
    const a = p[i], b = p[(i + 1) % n], c = p[(i + 2) % n]
    const u = restar(b, a), v = restar(c, b)
    if (Math.abs(cruz(u, v)) < EPS && u.x * v.x + u.y * v.y < 0) return false
  }
  return true
}

/** El borde cuenta como dentro. */
export function contienePunto(p: Punto[], q: Punto): boolean {
  if (distanciaAlBorde(p, q) < EPS) return true
  let dentro = false
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const a = p[i], b = p[j]
    if ((a.y > q.y) !== (b.y > q.y) && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) dentro = !dentro
  }
  return dentro
}
