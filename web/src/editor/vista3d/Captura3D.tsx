import { useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { DocumentoDiseno } from '../../nucleo'
import Escena from './Escena3D'

/** Fotogramas antes de capturar: dan tiempo a las sombras y a que todo esté montado. */
export const FOTOGRAMAS = 12

/** Densidad de píxeles de la captura: 1 (lo que mide el contenedor) o 2 (el doble por lado: para imprimir). */
export type DprCaptura = 1 | 2

/**
 * Captura en el fotograma `FOTOGRAMAS`. Con `dpr` 2 lo sube solo dos fotogramas antes: así los primeros (horneado de
 * sombras, texturas) van a tamaño normal y los caros, a cuatro veces los píxeles, son dos (cuenta en SwiftShader, el CI).
 */
export function Disparar({ alCapturar, dpr }: { alCapturar(url: string): void; dpr: DprCaptura }) {
  const n = useRef(0)
  const setDpr = useThree((e) => e.setDpr)
  useFrame(({ gl }) => {
    n.current += 1
    if (n.current === FOTOGRAMAS - 2 && dpr !== 1) setDpr(dpr)
    // preserveDrawingBuffer conserva el último fotograma pintado: el lienzo se puede leer entre fotogramas.
    if (n.current === FOTOGRAMAS) alCapturar(gl.domElement.toDataURL('image/png'))
  })
  return null
}

/**
 * Pinta la escena fuera de la pantalla, desde la cámara inicial, sin resaltes y con sombras suaves (salvo que se pidan
 * duras: la vista previa es una miniatura y el horneado no cabía en su tiempo en el CI), y devuelve la imagen.
 * El tamaño lo da la clase del contenedor (fuera de la pantalla): la cámara encuadra para él; `dpr` 2 dobla los píxeles.
 */
export default function Captura3D({ doc, alCapturar, className = 'hoja-impresion__lienzo3d', dpr = 1, sombras = 'suaves' }: {
  doc: DocumentoDiseno; alCapturar(url: string): void; className?: string; dpr?: DprCaptura; sombras?: 'duras' | 'suaves'
}) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas shadows dpr={1} camera={{ fov: 45 }} gl={{ preserveDrawingBuffer: true, antialias: true }}>
        <Escena doc={doc} ocultar encuadres={0} sinResaltes sombras={sombras} />
        <Disparar alCapturar={alCapturar} dpr={dpr} />
      </Canvas>
    </div>
  )
}
