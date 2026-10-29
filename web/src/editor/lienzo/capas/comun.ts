import type { PointerEvent } from 'react'
import type { Punto } from '../../../nucleo'

/** Atributo `points` de un polígono. */
export const puntos = (ps: Punto[]): string => ps.map((p) => `${p.x},${p.y}`).join(' ')

/** Manejador de `pointerdown` sobre una pieza; sin él, la pieza no se selecciona y el toque pasa al fondo. */
export type AlPulsar = (id: string, ev: PointerEvent<SVGGElement>) => void

export function manejador(id: string, alPulsar: AlPulsar | undefined) {
  if (!alPulsar) return undefined
  return (ev: PointerEvent<SVGGElement>) => {
    ev.stopPropagation()
    alPulsar(id, ev)
  }
}
