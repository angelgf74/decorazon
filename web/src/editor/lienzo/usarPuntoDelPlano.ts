import { createContext, useCallback, useContext, type PointerEvent as PointerEventReact, type RefObject } from 'react'
import type { Punto } from '../../nucleo'
import { aPlano, type Vista2D } from './vista'

export interface ContextoLienzo {
  /** El `<g>` transformado: su matriz de pantalla pasa de px de pantalla a cm. */
  plano: RefObject<SVGGElement | null>
  vista: RefObject<Vista2D>
}

export const ContextoLienzo = createContext<ContextoLienzo | null>(null)

type EventoConPosicion = PointerEvent | PointerEventReact | DragEvent

function puntoDelPlano({ plano, vista }: ContextoLienzo, ev: EventoConPosicion): Punto {
  const g = plano.current
  const ctm = g?.getScreenCTM?.()
  if (ctm) {
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse())
    return { x: p.x, y: p.y }
  }
  // jsdom no tiene getScreenCTM: desde la esquina del svg con la vista actual.
  const caja = g?.ownerSVGElement?.getBoundingClientRect()
  return aPlano(vista.current, { x: ev.clientX - (caja?.left ?? 0), y: ev.clientY - (caja?.top ?? 0) })
}

/** Punto del plano (cm) bajo un evento de puntero o de arrastre; solo dentro del `Lienzo`. */
export function usePuntoDelPlano(): (ev: EventoConPosicion) => Punto {
  const ctx = useContext(ContextoLienzo)
  if (ctx === null) throw new Error('usePuntoDelPlano fuera del Lienzo')
  return useCallback((ev: EventoConPosicion) => puntoDelPlano(ctx, ev), [ctx])
}
