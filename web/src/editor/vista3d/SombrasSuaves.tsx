import { memo } from 'react'
import { AccumulativeShadows, RandomizedLight } from '@react-three/drei'
import type { Vec3 } from '../../nucleo'

/** Pasos del horneado: drei los pinta todos en un layout effect, antes del primer fotograma. */
export const PASOS_SOMBRA = 24
/** Las luces van lejos para que sus rayos sean casi paralelos al sol, esté donde esté el centro de la estancia. */
export const DISTANCIA_LUCES_M = 40
/** El plano de sombras va un pelo sobre el suelo para no pelearse con él (z-fighting). */
export const ALTURA_PLANO_M = 0.005

interface Props {
  /** Centro de la planta en la escena (m) y radio de la esfera que la envuelve. */
  centro: Vec3
  radio: number
  /** Dirección del sol (unitaria), la misma que la `directionalLight` de la escena. */
  sol: Vec3
}

/**
 * Sombras suaves para la captura: un plano a ras de suelo donde drei acumula las sombras de varias luces desplazadas al
 * azar alrededor del sol (penumbra) y, con `ambient`, desde todo el hemisferio (oscurece el contacto con el suelo).
 * Solo en la captura: el horneado cuesta y la vista interactiva sigue con la sombra dura del sol.
 * Valores de partida ajustados mirando el salón de ejemplo; `AccumulativeShadows` rehornea en cada render del
 * componente, de ahí el `memo` por valor.
 */
function SombrasSuaves({ centro, radio, sol }: Props) {
  const [cx, , cz] = centro
  const size = Math.hypot(...centro) + radio + 1
  return (
    <AccumulativeShadows position={[cx, ALTURA_PLANO_M, cz]} scale={2 * radio} frames={PASOS_SOMBRA} resolution={1024} opacity={0.9}>
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

export default memo(SombrasSuaves, (a, b) => a.radio === b.radio && mismoVector(a.centro, b.centro) && mismoVector(a.sol, b.sol))
