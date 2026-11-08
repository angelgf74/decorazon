import { memo, useContext, useEffect, useMemo } from 'react'
import { AccumulativeShadows, accumulativeContext, RandomizedLight } from '@react-three/drei'
import type { Mesh } from 'three'
import type { Punto, Vec3 } from '../../nucleo'
import { geometriaReceptor } from './geometrias'

/** Pasos del horneado: drei los pinta todos de una vez, antes del primer fotograma. */
export const PASOS_SOMBRA = 24
/** Las luces van lejos para que sus rayos sean casi paralelos al sol, esté donde esté el centro de la estancia. */
export const DISTANCIA_LUCES_M = 40
/** El receptor va un pelo sobre el suelo para no pelearse con él (z-fighting). */
export const ALTURA_PLANO_M = 0.005

interface Props {
  /** Planta de la estancia en cm: es la forma del receptor (fuera de ella no hay suelo que reciba sombra). */
  planta: Punto[]
  /** Centro de la planta en la escena (m) y radio de la esfera que la envuelve. */
  centro: Vec3
  radio: number
  /** Dirección del sol (unitaria), la misma que la `directionalLight` de la escena. */
  sol: Vec3
}

/**
 * Cambia el plano cuadrado de drei por la planta: una sombra que cayera fuera de la estancia se pintaría sobre el fondo
 * transparente de la captura. El mesh de drei es un hermano posterior (su ref no existe en los layout effects de los
 * hijos) y el padre hornea en su propio layout effect, así que aquí se cambia la geometría en un efecto normal y se
 * vuelve a hornear sobre la planta: cuesta un horneado más (unos 0,3 s en SwiftShader).
 *
 * El horneado pinta el receptor «desenvuelto» por sus uv (ignora dónde está) pero three lo descarta igualmente por su
 * caja envolvente frente a la cámara de la captura, y un receptor del tamaño de la estancia no pasaba ese filtro: el
 * mapa salía vacío y todo el suelo, en sombra. El plano de drei solo se libraba por ser mucho mayor que la estancia.
 */
function Receptor({ planta, centro }: Pick<Props, 'planta' | 'centro'>) {
  const api = useContext(accumulativeContext)
  const geometria = useMemo(() => geometriaReceptor(planta, centro), [planta, centro])
  useEffect(() => {
    // drei lo tipa como Mesh<PlaneGeometry>; aquí es una malla con cualquier geometría.
    const malla = api.getMesh() as unknown as Mesh
    const previa = malla.geometry
    malla.geometry = geometria
    malla.frustumCulled = false
    api.reset()
    api.update(api.blend)
    return () => {
      malla.geometry = previa
      malla.frustumCulled = true
      geometria.dispose()
    }
  }, [api, geometria])
  return null
}

/**
 * Sombras suaves para la captura: sobre la planta, drei acumula las sombras de varias luces desplazadas al azar alrededor
 * del sol (penumbra) y, con `ambient`, desde todo el hemisferio (oscurece el contacto con el suelo). Solo en la captura:
 * el horneado cuesta y la vista interactiva sigue con la sombra dura del sol. `AccumulativeShadows` rehornea en cada
 * render del componente, de ahí el `memo` por valor. Valores ajustados mirando el salón y el dormitorio de ejemplo.
 */
function SombrasSuaves({ planta, centro, radio, sol }: Props) {
  const [cx, , cz] = centro
  // La cámara de sombras de cada luz mira al origen de la escena, no al centro de la estancia: abarca los dos.
  const size = Math.hypot(...centro) + radio + 1
  return (
    <AccumulativeShadows position={[cx, ALTURA_PLANO_M, cz]} scale={1} frames={PASOS_SOMBRA} resolution={1024} opacity={0.9}>
      <Receptor planta={planta} centro={centro} />
      <RandomizedLight
        amount={6}
        radius={4}
        ambient={0.4}
        mapSize={1024}
        position={[sol[0] * DISTANCIA_LUCES_M, sol[1] * DISTANCIA_LUCES_M, sol[2] * DISTANCIA_LUCES_M]}
        size={size}
        near={DISTANCIA_LUCES_M - size}
        far={DISTANCIA_LUCES_M + size}
      />
    </AccumulativeShadows>
  )
}

const mismoVector = (a: Vec3, b: Vec3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
const mismaPlanta = (a: Punto[], b: Punto[]) => a.length === b.length && a.every((p, i) => p.x === b[i]!.x && p.y === b[i]!.y)

export default memo(SombrasSuaves, (a, b) => a.radio === b.radio && mismoVector(a.centro, b.centro) && mismoVector(a.sol, b.sol) && mismaPlanta(a.planta, b.planta))
