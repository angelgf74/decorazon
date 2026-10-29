import { useEffect, useRef } from 'react'
import { textos } from '../../textos'

interface Props {
  abierto: boolean
  mensaje: string
  textoAceptar: string
  alAceptar(): void
  alCancelar(): void
}

export default function Confirmar({ abierto, mensaje, textoAceptar, alAceptar, alCancelar }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!abierto || d === null) return
    if (typeof d.showModal === 'function') d.showModal()
    if (!d.open) d.setAttribute('open', '')
    return () => d.close?.()
  }, [abierto])

  if (!abierto) return null
  return (
    <dialog ref={ref} className="confirmar" onCancel={(e) => { e.preventDefault(); alCancelar() }}>
      <p>{mensaje}</p>
      <div className="confirmar__botones">
        <button type="button" onClick={alCancelar}>{textos.comun.cancelar}</button>
        <button type="button" className="primario" onClick={alAceptar}>{textoAceptar}</button>
      </div>
    </dialog>
  )
}
