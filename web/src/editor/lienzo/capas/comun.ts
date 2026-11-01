import type { PointerEvent } from 'react'
import type { Punto } from '../../../nucleo'

/** Atributo `points` de un polígono. */
export const puntos = (ps: Punto[]): string => ps.map((p) => `${p.x},${p.y}`).join(' ')

/** Subtrazado cerrado de un polígono para el atributo `d` de un `path`. */
export const trazado = (ps: Punto[]): string => `M${ps.map((p) => `${p.x},${p.y}`).join(' ')}Z`

/**
 * true con el botón principal: el izquierdo del ratón o el contacto de un dedo o de la punta del lápiz (todos dan
 * `button` 0). Solo él toma piezas y tiradores; con el central o el derecho el toque sigue hasta el lienzo, que con el central hace pan.
 */
export const esBotonPrincipal = (ev: PointerEvent): boolean => ev.button === 0

/** Manejador de `pointerdown` sobre una pieza; sin él, la pieza no se selecciona y el toque pasa al fondo. */
export type AlPulsar = (id: string, ev: PointerEvent<SVGGElement>) => void

export function manejador(id: string, alPulsar: AlPulsar | undefined) {
  if (!alPulsar) return undefined
  return (ev: PointerEvent<SVGGElement>) => {
    if (!esBotonPrincipal(ev)) return
    ev.stopPropagation()
    alPulsar(id, ev)
  }
}
