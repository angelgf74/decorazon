import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { textos } from '../../textos'

/** Avisa una sola vez cuando el primer fotograma ya está en pantalla (el siguiente, tras pintarlo). */
function AlPintarse({ alPintarse }: { alPintarse: () => void }) {
  const avisado = useRef(false)
  useFrame(() => {
    if (avisado.current) return
    avisado.current = true
    requestAnimationFrame(alPintarse)
  })
  return null
}

/**
 * El Canvas de la vista 3D con un aviso mientras se prepara. Montar la escena y compilar sus shaders para el primer
 * fotograma deja la página parada más de medio segundo (~670 ms medidos en un móvil con Adreno 710). Por eso el
 * lienzo se monta dos fotogramas después del aviso, cuando ya está pintado, y el aviso se quita cuando la escena se ve.
 */
export default function Lienzo3D(props: ComponentProps<typeof Canvas>) {
  const { children, ...resto } = props
  const [montar, setMontar] = useState(false)
  const [pintado, setPintado] = useState(false)
  useEffect(() => {
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => setMontar(true))
    })
    return () => cancelAnimationFrame(id)
  }, [])
  return (
    <>
      {montar && (
        <Canvas {...resto}>
          <AlPintarse alPintarse={() => setPintado(true)} />
          {children}
        </Canvas>
      )}
      {!pintado && <p className="vista3d__preparando" role="status">{textos.vista3d.preparando}</p>}
    </>
  )
}
