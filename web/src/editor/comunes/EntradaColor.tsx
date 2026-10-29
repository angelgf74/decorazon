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
    // El `onChange` de React escucha el evento input: el change nativo hay que pedirlo aparte.
    el.addEventListener('change', terminar)
    return () => el.removeEventListener('change', terminar)
  }, [])
  return <input ref={ref} id={id} type="color" value={valor} onChange={(e) => alCambiar(e.target.value)} onBlur={terminar} />
}
