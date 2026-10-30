import type { ReactNode } from 'react'
import { textos } from '../../textos'
import { useDialogoModal } from './usarDialogoModal'

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
  // El navegador puede cerrarlo aunque se anule el Escape: cuenta como Escape y, si la página lo sigue queriendo abierto, se reabre.
  const { ref, alCerrar } = useDialogoModal(abierto, () => { if (!ocupado) alEscapar() })

  if (!abierto) return null
  return (
    <dialog
      ref={ref}
      className="confirmar"
      onCancel={(e) => { e.preventDefault(); if (!ocupado) alEscapar() }}
      onClose={alCerrar}
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
