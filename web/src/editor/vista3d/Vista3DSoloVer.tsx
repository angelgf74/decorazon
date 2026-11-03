import { useState } from 'react'
import type { DocumentoDiseno } from '../../nucleo'
import { textos } from '../../textos'
import SinFallos from '../comunes/SinFallos'
import Escena from './Escena3D'
import Lienzo3D from './Lienzo3D'
import './vista3d.css'

const t = textos.vista3d

/** La vista 3D de un diseño para mirarlo (girar, acercar, ocultar paredes) sin seleccionar ni editar nada. */
export default function Vista3DSoloVer({ doc }: { doc: DocumentoDiseno }) {
  const [ocultar, setOcultar] = useState(true)
  const [encuadres, setEncuadres] = useState(0)
  return (
    <div className="vista3d">
      {/* Sin «Volver al 2D» de AvisoVista3D: aquí no hay editor al que volver. */}
      <SinFallos alternativa={<div className="vista3d__aviso" role="alert"><p>{t.sinWebgl}</p></div>}>
        <div className="vista3d__barra">
          <button type="button" aria-pressed={ocultar} onClick={() => setOcultar(!ocultar)}>{t.ocultarParedes}</button>
          <button type="button" onClick={() => setEncuadres(encuadres + 1)}>{t.encuadrar}</button>
        </div>
        <Lienzo3D shadows frameloop="demand" dpr={[1, 2]} camera={{ fov: 45 }}>
          <Escena doc={doc} ocultar={ocultar} encuadres={encuadres} sinResaltes />
        </Lienzo3D>
      </SinFallos>
    </div>
  )
}
