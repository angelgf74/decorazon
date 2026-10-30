import { useEffect, useMemo } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import type { Material } from 'three'
import type { Pieza3D } from '../../nucleo'
import { geometriaPrisma } from './geometrias'
import { COLOR_SELECCION, materialDe, type EstadoPieza } from './materiales3d'

const SEGMENTOS_CILINDRO = 24
const GROSOR_CONTORNO_PX = 2

type Prisma3D = Extract<Pieza3D, { forma: 'prisma' }>

export type EventosPieza = Pick<ThreeElements['mesh'], 'onClick' | 'onPointerOver' | 'onPointerOut'>

/** Contorno de la selección: se ve también sobre el rojo de un conflicto. */
function Contorno() {
  return <Edges color={COLOR_SELECCION} lineWidth={GROSOR_CONTORNO_PX} />
}

function Prisma({ pieza: { huella, y0, y1 }, material, sombra, eventos, contorno }: { pieza: Prisma3D; material: Material; sombra: boolean; eventos: EventosPieza; contorno: boolean }) {
  const geometria = useMemo(() => geometriaPrisma(huella, y0, y1), [huella, y0, y1])
  useEffect(() => () => geometria.dispose(), [geometria])
  return (
    <mesh castShadow={sombra} receiveShadow geometry={geometria} material={material} {...eventos}>
      {contorno && <Contorno />}
    </mesh>
  )
}

export default function Pieza({ pieza, estado = 'normal', eventos = {}, proyecta = true, contorno = false }: {
  pieza: Pieza3D; estado?: EstadoPieza; eventos?: EventosPieza; proyecta?: boolean; contorno?: boolean
}) {
  const material = materialDe(pieza.material, pieza.color, estado)
  // El cristal de ventana deja pasar la luz: no proyecta sombra.
  const sombra = proyecta && pieza.material !== 'cristal'
  switch (pieza.forma) {
    case 'caja':
      return (
        <mesh castShadow={sombra} receiveShadow position={pieza.centro} rotation-y={pieza.giroY} material={material} {...eventos}>
          <boxGeometry args={pieza.tamano} />
          {contorno && <Contorno />}
        </mesh>
      )
    case 'cilindro':
      return (
        <mesh castShadow={sombra} receiveShadow position={pieza.centro} material={material} {...eventos}>
          <cylinderGeometry args={[pieza.radio, pieza.radio, pieza.alto, SEGMENTOS_CILINDRO]} />
          {contorno && <Contorno />}
        </mesh>
      )
    case 'prisma':
      return <Prisma pieza={pieza} material={material} sombra={sombra} eventos={eventos} contorno={contorno} />
  }
}
