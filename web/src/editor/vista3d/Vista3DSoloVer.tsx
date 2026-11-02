import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import type { DocumentoDiseno } from '../../nucleo'
import { textos } from '../../textos'
import AvisoVista3D from '../comunes/AvisoVista3D'
import SinFallos from '../comunes/SinFallos'
import Escena from './Escena3D'
import './vista3d.css'

const t = textos.vista3d

/** La vista 3D de un diseño para mirarlo (girar, acercar, ocultar paredes) sin seleccionar ni editar nada. */
export default function Vista3DSoloVer({ doc }: { doc: DocumentoDiseno }) {
  const [ocultar, setOcultar] = useState(true)
  const [encuadres, setEncuadres] = useState(0)
  return (
    <div className="vista3d">
      <SinFallos alternativa={<AvisoVista3D texto={t.sinWebgl} />}>
        <div className="vista3d__barra">
          <button type="button" aria-pressed={ocultar} onClick={() => setOcultar(!ocultar)}>{t.ocultarParedes}</button>
          <button type="button" onClick={() => setEncuadres(encuadres + 1)}>{t.encuadrar}</button>
        </div>
        <Canvas shadows frameloop="demand" dpr={[1, 2]} camera={{ fov: 45 }}>
          <Escena doc={doc} ocultar={ocultar} encuadres={encuadres} sinResaltes />
        </Canvas>
      </SinFallos>
    </div>
  )
}
