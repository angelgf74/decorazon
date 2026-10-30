import { useEffect, useRef, useState, type ReactNode } from 'react'
import { textos } from '../../textos'

interface Props {
  abierto: boolean
  mensaje: string
  textoAceptar: string
  textoCancelar?: string
  alAceptar(): void
  alCancelar(): void
  /** Escape; por defecto, como cancelar. */
  alEscapar?(): void
  /** Petición en curso: no se puede cancelar ni aceptar de nuevo. */
  ocupado?: boolean
  /** Contenido extra bajo el mensaje, como un campo. */
  children?: ReactNode
}

export default function Confirmar({ abierto, mensaje, textoAceptar, textoCancelar = textos.comun.cancelar, alAceptar, alCancelar, alEscapar = alCancelar, ocupado = false, children }: Props) {
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

  if (!abierto) return null
  return (
    <dialog
      ref={ref}
      className="confirmar"
      onCancel={(e) => { e.preventDefault(); if (!ocupado) alEscapar() }}
      // El navegador puede cerrarlo aunque se anule el Escape: cuenta como Escape y, si la página lo sigue queriendo abierto, se reabre.
      onClose={() => {
        if (!vigente.current || ref.current?.open) return
        if (!ocupado) alEscapar()
        setReaperturas((n) => n + 1)
      }}
    >
      <p>{mensaje}</p>
      {children}
      <div className="confirmar__botones">
        <button type="button" disabled={ocupado} onClick={alCancelar}>{textoCancelar}</button>
        <button type="button" className="primario" disabled={ocupado} onClick={alAceptar}>{textoAceptar}</button>
      </div>
    </dialog>
  )
}
