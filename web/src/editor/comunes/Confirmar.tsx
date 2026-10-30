import { useEffect, useRef, useState } from 'react'
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
}

export default function Confirmar({ abierto, mensaje, textoAceptar, textoCancelar = textos.comun.cancelar, alAceptar, alCancelar, alEscapar = alCancelar }: Props) {
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
      onCancel={(e) => { e.preventDefault(); alEscapar() }}
      // El navegador puede cerrarlo aunque se anule el Escape: cuenta como Escape y, si la página lo sigue queriendo abierto, se reabre.
      onClose={() => {
        if (!vigente.current || ref.current?.open) return
        alEscapar()
        setReaperturas((n) => n + 1)
      }}
    >
      <p>{mensaje}</p>
      <div className="confirmar__botones">
        <button type="button" onClick={alCancelar}>{textoCancelar}</button>
        <button type="button" className="primario" onClick={alAceptar}>{textoAceptar}</button>
      </div>
    </dialog>
  )
}
