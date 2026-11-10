import type { PiezaLocal } from './tipos'

/** Lados de una revolución si no se dicen: los mismos que un cilindro. */
export const LADOS_REVOLUCION = 24

/** Caja local en cm (x0 < x1, y0 < y1, z0 < z1). */
export interface CajaLocal { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }

/**
 * Ángulos de los meridianos de una revolución de `lados` lados. Van desplazados medio lado para que con 4 las caras queden
 * alineadas con los ejes; el meridiano de ángulo φ pasa por (r·sen φ, r·cos φ), como en `LatheGeometry`.
 */
export function angulosRevolucion(lados: number): number[] {
  return Array.from({ length: lados }, (_, k) => Math.PI / lados + (2 * Math.PI * k) / lados)
}

function rango(valores: number[]): [number, number] {
  return [Math.min(...valores), Math.max(...valores)]
}

/** La caja que envuelve la pieza, en el sistema local del elemento: la usan el test de integridad y quien desplaza piezas. */
export function cajaDePieza(p: PiezaLocal): CajaLocal {
  switch (p.forma) {
    case 'caja':
      return { x0: p.x0, y0: p.y0, z0: p.z0, x1: p.x1, y1: p.y1, z1: p.z1 }
    case 'cilindro':
      return { x0: p.cx - p.r, y0: p.cy - p.r, z0: p.z0, x1: p.cx + p.r, y1: p.cy + p.r, z1: p.z1 }
    case 'revolucion': {
      const r = Math.max(...p.perfil.map(([radio]) => radio))
      const angulos = angulosRevolucion(p.lados ?? LADOS_REVOLUCION)
      const [sx0, sx1] = rango(angulos.map((a) => Math.sin(a)))
      const [cy0, cy1] = rango(angulos.map((a) => Math.cos(a)))
      const e = p.escalaY ?? 1
      const [z0, z1] = rango(p.perfil.map(([, z]) => z))
      return { x0: p.cx + r * sx0, y0: p.cy + r * e * cy0, z0, x1: p.cx + r * sx1, y1: p.cy + r * e * cy1, z1 }
    }
    case 'extrusion': {
      const [a0, a1] = rango(p.contorno.map(([a]) => a))
      const [b0, b1] = rango(p.contorno.map(([, b]) => b))
      if (p.plano === 'planta') return { x0: a0, y0: b0, z0: p.desde, x1: a1, y1: b1, z1: p.hasta }
      if (p.plano === 'alzado') return { x0: a0, y0: p.desde, z0: b0, x1: a1, y1: p.hasta, z1: b1 }
      return { x0: p.desde, y0: a0, z0: b0, x1: p.hasta, y1: a1, z1: b1 }
    }
    case 'tubo':
      return cajaDeTubo(p)
  }
}

/**
 * Un tramo recto acaba en un disco perpendicular a su dirección d: en el eje k ocupa r·√(1 − d_k²) (una pata vertical no baja del
 * suelo). Un codo redondeado queda dentro del triángulo de su esquina, que se cuenta con el radio entero en todos los ejes.
 */
function cajaDeTubo(p: Extract<PiezaLocal, { forma: 'tubo' }>): CajaLocal {
  const n = p.puntos.length
  const c: CajaLocal = { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity }
  const extender = ([x, y, z]: [number, number, number], [ex, ey, ez]: [number, number, number]) => {
    c.x0 = Math.min(c.x0, x - ex)
    c.y0 = Math.min(c.y0, y - ey)
    c.z0 = Math.min(c.z0, z - ez)
    c.x1 = Math.max(c.x1, x + ex)
    c.y1 = Math.max(c.y1, y + ey)
    c.z1 = Math.max(c.z1, z + ez)
  }
  const tramos = p.cerrado ? n : n - 1
  for (let i = 0; i < tramos; i++) {
    const a = p.puntos[i]!
    const b = p.puntos[(i + 1) % n]!
    const largo = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
    const disco = [0, 1, 2].map((k) => p.r * Math.sqrt(Math.max(0, 1 - ((b[k]! - a[k]!) / largo) ** 2))) as [number, number, number]
    extender(a, disco)
    extender(b, disco)
  }
  if ((p.codo ?? 0) > 0) p.puntos.forEach((q, i) => (p.cerrado || (i > 0 && i < n - 1)) && extender(q, [p.r, p.r, p.r]))
  return c
}
