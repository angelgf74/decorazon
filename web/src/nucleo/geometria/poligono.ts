import { cruz, longitud, normalizar, punto, restar, type Punto } from './vector'

const EPS = 1e-9

/** Área por la fórmula del lazo; positiva si es horaria en pantalla (y hacia abajo). */
export function areaConSigno(p: Punto[]): number {
  let s = 0
  for (let i = 0; i < p.length; i++) s += cruz(p[i], p[(i + 1) % p.length])
  return s / 2
}

/** Superficie en cm², sea cual sea el sentido del polígono. */
export const superficie = (p: Punto[]): number => Math.abs(areaConSigno(p))

/** Suma de las paredes, en cm. */
export function perimetro(p: Punto[]): number {
  let s = 0
  for (let i = 0; i < p.length; i++) s += longitud(restar(p[(i + 1) % p.length], p[i]))
  return s
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

/** Desplaza cada arista d hacia fuera (planta horaria) y une las rectas consecutivas en inglete. */
export function desplazarPoligono(p: Punto[], d: number): Punto[] {
  const n = p.length
  const normal = (i: number): Punto => {
    const u = normalizar(restar(p[(i + 1) % n], p[i]))
    return { x: u.y, y: -u.x }
  }
  return p.map((v, i) => {
    const n1 = normal((i - 1 + n) % n)
    const n2 = normal(i)
    if (Math.abs(cruz(n1, n2)) < EPS) return { x: v.x + d * n2.x, y: v.y + d * n2.y }
    const k = d / (1 + punto(n1, n2))
    return { x: v.x + k * (n1.x + n2.x), y: v.y + k * (n1.y + n2.y) }
  })
}

export interface Caja { minX: number; minY: number; maxX: number; maxY: number }

/** Caja envolvente de la planta, alineada con los ejes. */
export function cajaPlanta(planta: Punto[]): Caja {
  const xs = planta.map(p => p.x), ys = planta.map(p => p.y)
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) }
}

/** Lo que el centro de la caja tiene que apartarse del borde para servir como punto interior. */
const MARGEN_INTERIOR_CM = 1
const CELDAS_REJILLA = 20

/**
 * Punto de dentro de la planta, en cm enteros, donde poner algo nuevo: el centro de la caja si cae dentro y a 1 cm o
 * más del borde; si no (una L), el de una rejilla de 20 × 20 sobre la caja que, dentro, queda más lejos del borde.
 */
export function puntoInterior(planta: Punto[]): Punto {
  const c = cajaPlanta(planta)
  const centro = { x: Math.round((c.minX + c.maxX) / 2), y: Math.round((c.minY + c.maxY) / 2) }
  if (contienePunto(planta, centro) && distanciaAlBorde(planta, centro) >= MARGEN_INTERIOR_CM) return centro
  let mejor = { p: centro, d: -Infinity }
  for (let i = 0; i < CELDAS_REJILLA; i++) {
    for (let j = 0; j < CELDAS_REJILLA; j++) {
      const p = {
        x: Math.round(c.minX + ((i + 0.5) * (c.maxX - c.minX)) / CELDAS_REJILLA),
        y: Math.round(c.minY + ((j + 0.5) * (c.maxY - c.minY)) / CELDAS_REJILLA),
      }
      const d = distanciaAlBorde(planta, p)
      if (d > mejor.d && contienePunto(planta, p)) mejor = { p, d }
    }
  }
  return mejor.p
}

/**
 * Tramo de la vertical x = p.x que queda dentro de la planta y contiene a p: de la pared de arriba a la de abajo, en cm
 * enteros redondeados hacia dentro. Con p fuera de la planta, el tramo es el propio punto.
 */
export function tramoVertical(planta: Punto[], p: Punto): { desde: number; hasta: number } {
  const cortes: number[] = []
  for (let i = 0; i < planta.length; i++) {
    const a = planta[i], b = planta[(i + 1) % planta.length]
    // Semiabierto: un vértice sobre la vertical se cuenta una sola vez y las paredes verticales no cortan.
    if ((a.x > p.x) !== (b.x > p.x)) cortes.push(a.y + ((p.x - a.x) * (b.y - a.y)) / (b.x - a.x))
  }
  cortes.sort((u, v) => u - v)
  for (let k = 0; k + 1 < cortes.length; k += 2) {
    // `+ 0` convierte el −0 de Math.ceil(−EPS) en 0.
    if (cortes[k] <= p.y && p.y <= cortes[k + 1]) return { desde: Math.ceil(cortes[k] - EPS) + 0, hasta: Math.floor(cortes[k + 1] + EPS) + 0 }
  }
  return { desde: p.y, hasta: p.y }
}
