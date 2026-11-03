import { useState } from 'react'
import { textos } from '../../textos'
import AvisoVista3D from '../comunes/AvisoVista3D'
import SinFallos from '../comunes/SinFallos'
import { hayWebgl } from '../comunes/webgl'
import { almacen, useEditor } from '../estado/almacen'
import Escena from './Escena3D'
import Lienzo3D from './Lienzo3D'
import './vista3d.css'

const t = textos.vista3d

export default function Vista3D() {
  const doc = useEditor((e) => e.documento)
  const anularMueble = () => {
    const e = almacen.getState()
    if (e.seleccion?.tipo === 'elemento') e.seleccionar(null)
  }
  const [conWebgl] = useState(hayWebgl)
  const [ocultar, setOcultar] = useState(true)
  const [encuadres, setEncuadres] = useState(0)
  if (doc === null) return null

  const aviso = <AvisoVista3D texto={t.sinWebgl} />

  return (
    <div className="vista3d">
      {conWebgl ? (
        <SinFallos alternativa={aviso}>
          <div className="vista3d__barra">
            <button type="button" aria-pressed={ocultar} onClick={() => setOcultar(!ocultar)}>{t.ocultarParedes}</button>
            <button type="button" onClick={() => setEncuadres(encuadres + 1)}>{t.encuadrar}</button>
          </div>
          {/* Pulsar el vacío (o el suelo, para mirar) solo suelta un mueble: lo seleccionado en el paso 1 sigue. */}
          <Lienzo3D shadows frameloop="demand" dpr={[1, 2]} camera={{ fov: 45 }} onPointerMissed={anularMueble}>
            <Escena doc={doc} ocultar={ocultar} encuadres={encuadres} />
          </Lienzo3D>
        </SinFallos>
      ) : aviso}
    </div>
  )
}
