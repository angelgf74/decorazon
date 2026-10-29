import { useEffect, useMemo } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import type { Material } from 'three'
import type { Pieza3D } from '../../nucleo'
import { geometriaPrisma } from './geometrias'
import { materialDe, type EstadoPieza } from './materiales3d'

const SEGMENTOS_CILINDRO = 24

type Prisma3D = Extract<Pieza3D, { forma: 'prisma' }>

export type EventosPieza = Pick<ThreeElements['mesh'], 'onClick' | 'onPointerOver' | 'onPointerOut'>

function Prisma({ pieza: { huella, y0, y1 }, material, sombra, eventos }: { pieza: Prisma3D; material: Material; sombra: boolean; eventos: EventosPieza }) {
  const geometria = useMemo(() => geometriaPrisma(huella, y0, y1), [huella, y0, y1])
  useEffect(() => () => geometria.dispose(), [geometria])
  return <mesh castShadow={sombra} receiveShadow geometry={geometria} material={material} {...eventos} />
}

export default function Pieza({ pieza, estado = 'normal', eventos = {} }: { pieza: Pieza3D; estado?: EstadoPieza; eventos?: EventosPieza }) {
  const material = materialDe(pieza.material, pieza.color, estado)
  // El vidrio deja pasar la luz: no proyecta sombra.
  const sombra = pieza.material !== 'vidrio'
  switch (pieza.forma) {
    case 'caja':
      return (
        <mesh castShadow={sombra} receiveShadow position={pieza.centro} rotation-y={pieza.giroY} material={material} {...eventos}>
          <boxGeometry args={pieza.tamano} />
        </mesh>
      )
    case 'cilindro':
      return (
        <mesh castShadow={sombra} receiveShadow position={pieza.centro} material={material} {...eventos}>
          <cylinderGeometry args={[pieza.radio, pieza.radio, pieza.alto, SEGMENTOS_CILINDRO]} />
        </mesh>
      )
    case 'prisma':
      return <Prisma pieza={pieza} material={material} sombra={sombra} eventos={eventos} />
  }
}
