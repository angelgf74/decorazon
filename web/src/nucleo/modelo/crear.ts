import type { Punto } from '../geometria/vector'
import type { DocumentoDiseno, TipoEstancia } from './documento'

export type Esquina = 'arriba-izquierda' | 'arriba-derecha' | 'abajo-izquierda' | 'abajo-derecha'
export const ESQUINAS: readonly Esquina[] = ['arriba-izquierda', 'arriba-derecha', 'abajo-izquierda', 'abajo-derecha']

/**
 * La forma con que nace la planta (M-04): el rectángulo de siempre, o una L, que es el rectángulo sin un entrante
 * rectangular en una de sus esquinas (un hueco pequeño en un rincón es la misma forma con un entrante pequeño).
 */
export type FormaDePlanta =
  | { forma: 'rectangulo' }
  | { forma: 'ele'; entranteAncho: number; entranteLargo: number; esquina: Esquina }

/** Lo menos que queda de estancia a cada lado del entrante. */
export const MARGEN_ENTRANTE_CM = 50

const RECTANGULO: FormaDePlanta = { forma: 'rectangulo' }

/** Vértices de la planta, en el sentido del rectángulo (x a la derecha, y hacia abajo). El entrante se recorta a [50, medida − 50]. */
export function plantaDeForma(ancho: number, largo: number, forma: FormaDePlanta): Punto[] {
  const a = ancho, l = largo
  if (forma.forma === 'rectangulo') return [{ x: 0, y: 0 }, { x: a, y: 0 }, { x: a, y: l }, { x: 0, y: l }]
  const recortar = (v: number, medida: number) => Math.max(MARGEN_ENTRANTE_CM, Math.min(medida - MARGEN_ENTRANTE_CM, Math.round(v)))
  const ea = recortar(forma.entranteAncho, a), el = recortar(forma.entranteLargo, l)
  switch (forma.esquina) {
    case 'abajo-derecha': return [{ x: 0, y: 0 }, { x: a, y: 0 }, { x: a, y: l - el }, { x: a - ea, y: l - el }, { x: a - ea, y: l }, { x: 0, y: l }]
    case 'abajo-izquierda': return [{ x: 0, y: 0 }, { x: a, y: 0 }, { x: a, y: l }, { x: ea, y: l }, { x: ea, y: l - el }, { x: 0, y: l - el }]
    case 'arriba-derecha': return [{ x: 0, y: 0 }, { x: a - ea, y: 0 }, { x: a - ea, y: el }, { x: a, y: el }, { x: a, y: l }, { x: 0, y: l }]
    case 'arriba-izquierda': return [{ x: ea, y: 0 }, { x: a, y: 0 }, { x: a, y: l }, { x: 0, y: l }, { x: 0, y: el }, { x: ea, y: el }]
  }
}

export function documentoNuevo(tipo: TipoEstancia, ancho: number, largo: number, alto: number, forma: FormaDePlanta = RECTANGULO): DocumentoDiseno {
  return {
    formato: 1,
    estancia: {
      tipo,
      alto,
      grosorPared: 10,
      planta: plantaDeForma(ancho, largo, forma),
      colorParedes: '#f4f1ea',
      colorSuelo: '#c8a77e',
    },
    aberturas: [],
    estructura: [],
    elementos: [],
  }
}
