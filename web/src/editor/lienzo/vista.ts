import { cajaPlanta, type Punto } from '../../nucleo'

/** `escala` en px por cm; `x`, `y`: posición en px del origen del plano. */
export interface Vista2D { x: number; y: number; escala: number }

export const ESCALA_MIN = 0.1
export const ESCALA_MAX = 10

const recortar = (escala: number): number => Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, escala))

export function encuadrar(planta: Punto[], anchoPx: number, altoPx: number, margenPx = 48): Vista2D {
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
