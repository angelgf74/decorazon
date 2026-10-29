import { useEffect, useRef } from 'react'
import { almacen } from '../estado/almacen'

const terminar = () => almacen.getState().terminarGrupo()

/**
 * `input type="color"`. Quien lo usa agrupa los cambios en un grupo de deshacer; el grupo se cierra al terminar la
 * elección (el `change` nativo al cerrar el selector, o el blur), para que dos elecciones sean dos pasos.
 */
export default function EntradaColor({ id, valor, alCambiar }: { id: string; valor: string; alCambiar(color: string): void }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // React atiende input y change en `onChange` y descarta el segundo si el valor no cambió; el change nativo, que
    // llega al cerrar el selector, se escucha aparte para cerrar el grupo.
    el.addEventListener('change', terminar)
    return () => el.removeEventListener('change', terminar)
  }, [])
  return <input ref={ref} id={id} type="color" value={valor} onChange={(e) => alCambiar(e.target.value)} onBlur={terminar} />
}
