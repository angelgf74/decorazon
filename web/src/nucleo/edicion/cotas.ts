import { redondearAbajo, TOLERANCIA_CM } from '../geometria/tolerancia'
import { cruz, escalar, normalizar, restar, sumar, type Punto } from '../geometria/vector'

export interface Cota { desde: Punto; hasta: Punto; valor: number }

const EPS = 1e-9

/** Distancia por el rayo `origen + t·dir` (dir unitario) al primer tramo de la planta que corta, o null. */
function distanciaRayo(planta: Punto[], origen: Punto, dir: Punto): number | null {
  let mejor: number | null = null
  for (let i = 0; i < planta.length; i++) {
    const a = planta[i]
    const e = restar(planta[(i + 1) % planta.length], a)
    const den = cruz(dir, e)
    if (Math.abs(den) < EPS) continue
    const ao = restar(a, origen)
    const t = cruz(ao, e) / den
    const s = cruz(ao, dir) / den
    if (t > EPS && s >= -EPS && s <= 1 + EPS && (mejor === null || t < mejor)) mejor = t
  }
  return mejor
}

/** Una cota por lado del rectángulo (4 vértices horarios), desde su punto medio hasta la pared por la normal exterior. */
export function cotasAParedes(planta: Punto[], rect: Punto[]): Cota[] {
  const cotas: Cota[] = []
  for (let i = 0; i < rect.length; i++) {
    const a = rect[i]
    const b = rect[(i + 1) % rect.length]
    const u = normalizar(restar(b, a))
    const normal = { x: u.y, y: -u.x }
    const desde = escalar(sumar(a, b), 0.5)
    const t = distanciaRayo(planta, desde, normal)
    if (t === null || t <= TOLERANCIA_CM) continue
    cotas.push({ desde, hasta: sumar(desde, escalar(normal, t)), valor: redondearAbajo(t) })
  }
  return cotas
}
