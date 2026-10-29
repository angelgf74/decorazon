import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { textos } from '../../textos'
import AvisoVista3D from '../comunes/AvisoVista3D'
import SinFallos from '../comunes/SinFallos'
import { useEditor } from '../estado/almacen'
import Escena from './Escena3D'
import './vista3d.css'

const t = textos.vista3d

function hayWebgl(): boolean {
  try {
    const lienzo = document.createElement('canvas')
    const contexto = lienzo.getContext('webgl2') ?? lienzo.getContext('webgl')
    contexto?.getExtension('WEBGL_lose_context')?.loseContext()
    return contexto !== null
  } catch {
    return false
  }
}

export default function Vista3D() {
  const doc = useEditor((e) => e.documento)
  const seleccionar = useEditor((e) => e.seleccionar)
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
          <Canvas shadows frameloop="demand" dpr={[1, 2]} camera={{ fov: 45 }} onPointerMissed={() => seleccionar(null)}>
            <Escena doc={doc} ocultar={ocultar} encuadres={encuadres} />
          </Canvas>
        </SinFallos>
      ) : aviso}
    </div>
  )
}
