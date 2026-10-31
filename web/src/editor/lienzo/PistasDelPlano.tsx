import { useId, useState } from 'react'
import { textos } from '../../textos'
import Icono from '../comunes/Icono'
import { useEditor } from '../estado/almacen'

const t = textos.lienzo.pistas

export const CLAVE_PISTAS_OCULTAS = 'decorazon.pistasOcultas'

// Preferencia de quien mira, solo para comodidad: sin almacenamiento vale para esta sesión.
function leerOcultas(): boolean {
  try {
    return localStorage.getItem(CLAVE_PISTAS_OCULTAS) === '1'
  } catch {
    return false
  }
}

function guardarOcultas(ocultas: boolean): void {
  try {
    if (ocultas) localStorage.setItem(CLAVE_PISTAS_OCULTAS, '1')
    else localStorage.removeItem(CLAVE_PISTAS_OCULTAS)
  } catch {
    // Se pierde al recargar, nada más.
  }
}

/** Lo que se puede hacer en el plano en cada paso, abajo a la izquierda. Se puede cerrar y volver a abrir. */
export default function PistasDelPlano() {
  const paso = useEditor((e) => e.paso)
  const [ocultas, setOcultas] = useState(leerOcultas)
  const id = useId()

  const cambiar = (valor: boolean) => {
    setOcultas(valor)
    guardarOcultas(valor)
  }

  if (ocultas) {
    return (
      <button type="button" className="boton-icono lienzo__mostrar-pistas" title={t.mostrar} onClick={() => cambiar(false)}>
        <Icono nombre="ayuda" /><span className="solo-lectores">{t.mostrar}</span>
      </button>
    )
  }

  return (
    <aside className="lienzo__pistas" aria-labelledby={id}>
      <h2 id={id} className="solo-lectores">{t.titulo}</h2>
      <ul>
        {(paso === 1 ? t.paso1 : t.paso2).map((p) => <li key={p}>{p}</li>)}
        {/* Con el dedo no hay rueda (lienzo.css la oculta en pantallas táctiles). */}
        <li className="lienzo__pista-rueda">{t.rueda}</li>
      </ul>
      <button type="button" className="boton-icono" title={t.ocultar} onClick={() => cambiar(true)}>
        <Icono nombre="cerrar" /><span className="solo-lectores">{t.ocultar}</span>
      </button>
    </aside>
  )
}
