import { cajaPlanta, type Punto } from '../../nucleo'

/** `escala` en px por cm; `x`, `y`: posición en px del origen del plano. */
export interface Vista2D { x: number; y: number; escala: number }

export const ESCALA_MIN = 0.1
export const ESCALA_MAX = 10

const recortar = (escala: number): number => Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, escala))

/** Las cotas van a 34 px del muro con el texto centrado en su línea: a menos margen, en un móvil se cortan. */
export const MARGEN_ENCUADRE_PX = 64

export function encuadrar(planta: Punto[], anchoPx: number, altoPx: number, margenPx = MARGEN_ENCUADRE_PX): Vista2D {
  const { minX, maxX, minY, maxY } = cajaPlanta(planta)
  const ancho = Math.max(maxX - minX, 1), alto = Math.max(maxY - minY, 1)
  const libreX = Math.max(anchoPx - 2 * margenPx, 1), libreY = Math.max(altoPx - 2 * margenPx, 1)
  const escala = recortar(Math.min(libreX / ancho, libreY / alto))
  return {
    x: anchoPx / 2 - ((minX + maxX) / 2) * escala,
    y: altoPx / 2 - ((minY + maxY) / 2) * escala,
    escala,
  }
}

export const aPantalla = (v: Vista2D, p: Punto): Punto => ({ x: v.x + p.x * v.escala, y: v.y + p.y * v.escala })
export const aPlano = (v: Vista2D, px: Punto): Punto => ({ x: (px.x - v.x) / v.escala, y: (px.y - v.y) / v.escala })

/** Zoom que deja quieto el punto del plano bajo `px`. */
export function zoomEn(v: Vista2D, factor: number, px: Punto): Vista2D {
  const escala = recortar(v.escala * factor)
  const p = aPlano(v, px)
  return { x: px.x - p.x * escala, y: px.y - p.y * escala, escala }
}

const medio = (a: Punto, b: Punto): Punto => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

/**
 * Pellizco con dos dedos desde `inicio`: la escala sigue a la distancia entre los dedos, alrededor de su punto medio,
 * y el plano se desplaza con ese punto medio.
 */
export function pellizcar(inicio: Vista2D, antes: [Punto, Punto], ahora: [Punto, Punto]): Vista2D {
  const d0 = Math.hypot(antes[1].x - antes[0].x, antes[1].y - antes[0].y)
  const d1 = Math.hypot(ahora[1].x - ahora[0].x, ahora[1].y - ahora[0].y)
  const m0 = medio(...antes), m1 = medio(...ahora)
  const z = zoomEn(inicio, d0 > 0 ? d1 / d0 : 1, m0)
  return { ...z, x: z.x + m1.x - m0.x, y: z.y + m1.y - m0.y }
}
