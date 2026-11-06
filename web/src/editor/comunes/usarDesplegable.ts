import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

/**
 * Un desplegable (menú, lista de avisos) colgado de un botón: se abre y cierra con el botón, se cierra con Escape o
 * pulsando fuera, y al cerrarse devuelve el foco al botón, que sigue existiendo cuando lo desplegado ya no.
 * `raiz` envuelve botón y contenido; `disparador` es el botón.
 */
export function useDesplegable<T extends HTMLElement = HTMLDivElement>() {
  const [abierto, setAbierto] = useState(false)
  const raiz = useRef<T>(null)
  const disparador = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!abierto) return
    const alPulsarFuera = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('pointerdown', alPulsarFuera)
    return () => document.removeEventListener('pointerdown', alPulsarFuera)
  }, [abierto])

  const cerrar = () => {
    setAbierto(false)
    disparador.current?.focus()
  }

  const alTeclear = (e: KeyboardEvent<T>) => {
    if (!abierto || e.key !== 'Escape') return
    // Que Escape no suelte además la selección del plano (usarAtajos escucha en la ventana).
    e.stopPropagation()
    cerrar()
  }

  return { abierto, alternar: () => setAbierto((a) => !a), cerrar, raiz, disparador, alTeclear }
}
