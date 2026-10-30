import { useEffect, useRef, useState } from 'react'
import { textos } from '../../textos'
import { almacen, useEditor } from '../estado/almacen'
import { resolverConflicto, type Eleccion } from '../persistencia/sincronizacion'

const t = textos.conflicto

export default function ConflictoDeVersion() {
  const abierto = useEditor((e) => e.guardado === 'conflicto')
  const [ocupado, setOcupado] = useState(false)
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!abierto || d === null) return
    if (typeof d.showModal === 'function') d.showModal()
    if (!d.open) d.setAttribute('open', '')
    return () => d.close?.()
  }, [abierto])

  if (!abierto) return null

  const elegir = async (eleccion: Eleccion) => {
    setOcupado(true)
    try {
      await resolverConflicto(almacen, eleccion)
    } finally {
      setOcupado(false)
    }
  }

  return (
    // Sin cerrar con Escape: hay que elegir una de las dos.
    <dialog ref={ref} className="confirmar" aria-labelledby="conflicto-mensaje" onCancel={(e) => e.preventDefault()}>
      <p id="conflicto-mensaje">{t.mensaje}</p>
      <p>{t.aviso}</p>
      <div className="confirmar__botones">
        <button type="button" disabled={ocupado} onClick={() => void elegir('recargar')}>{t.recargar}</button>
        <button type="button" className="primario" disabled={ocupado} onClick={() => void elegir('sobrescribir')}>{t.sobrescribir}</button>
      </div>
    </dialog>
  )
}
