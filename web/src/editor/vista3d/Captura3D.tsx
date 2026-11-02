import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { DocumentoDiseno } from '../../nucleo'
import Escena from './Escena3D'

/** Fotogramas antes de capturar: dan tiempo a las sombras y a que todo esté montado. */
const FOTOGRAMAS = 12

function Disparar({ alCapturar }: { alCapturar(url: string): void }) {
  const n = useRef(0)
  useFrame(({ gl }) => {
    n.current += 1
    // preserveDrawingBuffer conserva el último fotograma pintado: el lienzo se puede leer entre fotogramas.
    if (n.current === FOTOGRAMAS) alCapturar(gl.domElement.toDataURL('image/png'))
  })
  return null
}

/** Pinta la escena fuera de la pantalla, desde la cámara inicial y sin resaltes, y devuelve la imagen. */
export default function Captura3D({ doc, alCapturar }: { doc: DocumentoDiseno; alCapturar(url: string): void }) {
  return (
    <div className="hoja-impresion__lienzo3d" aria-hidden="true">
      <Canvas shadows dpr={1} camera={{ fov: 45 }} gl={{ preserveDrawingBuffer: true }}>
        <Escena doc={doc} ocultar encuadres={0} sinResaltes />
        <Disparar alCapturar={alCapturar} />
      </Canvas>
    </div>
  )
}
