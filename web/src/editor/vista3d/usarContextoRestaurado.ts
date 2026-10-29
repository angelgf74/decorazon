import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

/** Con frameloop "demand", tras perder y recuperar el contexto WebGL nadie repinta: el lienzo se queda negro. */
export function useContextoRestaurado() {
  const lienzo = useThree((e) => e.gl.domElement)
  const invalidar = useThree((e) => e.invalidate)
  useEffect(() => {
    const repintar = () => invalidar()
    lienzo.addEventListener('webglcontextrestored', repintar)
    return () => lienzo.removeEventListener('webglcontextrestored', repintar)
  }, [lienzo, invalidar])
}
