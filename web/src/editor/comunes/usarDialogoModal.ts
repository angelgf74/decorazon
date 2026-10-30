import { useEffect, useRef, useState } from 'react'

/**
 * Abre un <dialog> como modal mientras `abierto` sea cierto.
 * El navegador puede cerrarlo aunque se anule el Escape (Chrome, tras dos seguidos): se avisa con `alCerrarlo` y,
 * si la página lo sigue queriendo abierto, se reabre.
 */
export function useDialogoModal(abierto: boolean, alCerrarlo?: () => void) {
  const ref = useRef<HTMLDialogElement>(null)
  const vigente = useRef(abierto)
  const [reaperturas, setReaperturas] = useState(0)

  useEffect(() => {
    vigente.current = abierto
  }, [abierto])

  useEffect(() => {
    const d = ref.current
    if (!abierto || d === null) return
    if (typeof d.showModal === 'function') d.showModal()
    if (!d.open) d.setAttribute('open', '')
    return () => d.close?.()
  }, [abierto, reaperturas])

  const alCerrar = () => {
    if (!vigente.current || ref.current?.open) return
    alCerrarlo?.()
    setReaperturas((n) => n + 1)
  }

  return { ref, alCerrar }
}
