export interface Punto { x: number; y: number }

export const sumar = (a: Punto, b: Punto): Punto => ({ x: a.x + b.x, y: a.y + b.y })
export const restar = (a: Punto, b: Punto): Punto => ({ x: a.x - b.x, y: a.y - b.y })
export const escalar = (p: Punto, k: number): Punto => ({ x: p.x * k, y: p.y * k })
/** Producto escalar. */
export const punto = (a: Punto, b: Punto): number => a.x * b.x + a.y * b.y
/** Componente z del producto vectorial. */
export const cruz = (a: Punto, b: Punto): number => a.x * b.y - a.y * b.x
export const longitud = (p: Punto): number => Math.hypot(p.x, p.y)
export function normalizar(p: Punto): Punto {
  const l = longitud(p)
  return l === 0 ? { x: 0, y: 0 } : { x: p.x / l, y: p.y / l }
}
/** Rotación en grados, positiva en sentido horario en pantalla (y hacia abajo). */
export function rotar(p: Punto, grados: number): Punto {
  const r = (grados * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c }
}
