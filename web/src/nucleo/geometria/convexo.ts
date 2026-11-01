import { areaConSigno, distanciaSegmentos } from './poligono'
import { cruz, longitud, normalizar, punto, restar, type Punto } from './vector'

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

const horario = (p: Punto[]): Punto[] => (areaConSigno(p) < 0 ? [...p].reverse() : p)

/**
 * Polígono común de `a` (sujeto) y `b` (ventana de recorte) con Sutherland–Hodgman, en sentido horario, o [] si no se
 * solapan o solo se tocan. La ventana `b` tiene que ser convexa; el sujeto `a` puede ser cualquier polígono simple (si es
 * cóncavo, el resultado puede llevar aristas degeneradas de área cero, inofensivas al pintar). Vale con cualquier sentido de vértices.
 */
export function interseccionConvexos(a: Punto[], b: Punto[]): Punto[] {
  const clip = horario(b)
  let salida = horario(a)
  for (let i = 0; i < clip.length && salida.length > 0; i++) {
    const p1 = clip[i], p2 = clip[(i + 1) % clip.length]
    const lado = restar(p2, p1)
    const dentro = (q: Punto) => cruz(lado, restar(q, p1)) >= 0
    const entrada = salida
    salida = []
    for (let j = 0; j < entrada.length; j++) {
      const actual = entrada[j], previo = entrada[(j + entrada.length - 1) % entrada.length]
      if (dentro(actual) !== dentro(previo)) {
        const d = restar(actual, previo)
        const t = cruz(lado, restar(p1, previo)) / cruz(lado, d)
        salida.push({ x: previo.x + t * d.x, y: previo.y + t * d.y })
      }
      if (dentro(actual)) salida.push(actual)
    }
  }
  return salida.length >= 3 && areaConSigno(salida) > 1e-9 ? salida : []
}
