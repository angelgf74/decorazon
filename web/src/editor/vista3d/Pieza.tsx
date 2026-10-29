import { useEffect, useMemo } from 'react'
import type { Material } from 'three'
import type { Pieza3D } from '../../nucleo'
import { geometriaPrisma } from './geometrias'
import { materialDe, type EstadoPieza } from './materiales3d'

const SEGMENTOS_CILINDRO = 24

type Prisma3D = Extract<Pieza3D, { forma: 'prisma' }>

function Prisma({ pieza: { huella, y0, y1 }, material }: { pieza: Prisma3D; material: Material }) {
  const geometria = useMemo(() => geometriaPrisma(huella, y0, y1), [huella, y0, y1])
  useEffect(() => () => geometria.dispose(), [geometria])
  return <mesh castShadow receiveShadow geometry={geometria} material={material} />
}

export default function Pieza({ pieza, estado = 'normal' }: { pieza: Pieza3D; estado?: EstadoPieza }) {
  const material = materialDe(pieza.material, pieza.color, estado)
  switch (pieza.forma) {
    case 'caja':
      return (
        <mesh castShadow receiveShadow position={pieza.centro} rotation-y={pieza.giroY} material={material}>
          <boxGeometry args={pieza.tamano} />
        </mesh>
      )
    case 'cilindro':
      return (
        <mesh castShadow receiveShadow position={pieza.centro} material={material}>
          <cylinderGeometry args={[pieza.radio, pieza.radio, pieza.alto, SEGMENTOS_CILINDRO]} />
        </mesh>
      )
    case 'prisma':
      return <Prisma pieza={pieza} material={material} />
  }
}
