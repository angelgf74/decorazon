import { useEffect, useMemo } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import { BoxGeometry, CylinderGeometry, type Material } from 'three'
import type { Pieza3D } from '../../nucleo'
import { geometriaPrisma, uvsEnMetros } from './geometrias'
import { COLOR_SELECCION, materialDe, type EstadoPieza } from './materiales3d'

const SEGMENTOS_CILINDRO = 24
const GROSOR_CONTORNO_PX = 2

type Prisma3D = Extract<Pieza3D, { forma: 'prisma' }>
type Caja3D = Extract<Pieza3D, { forma: 'caja' }>
type Cilindro3D = Extract<Pieza3D, { forma: 'cilindro' }>

export type EventosPieza = Pick<ThreeElements['mesh'], 'onClick' | 'onPointerOver' | 'onPointerOut' | 'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel'>

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

/** Caja y cilindro con las coordenadas de textura en metros (`uvsEnMetros`): la veta no se estira con el tamaño. */
function Caja({ pieza: { centro, tamano: [x, y, z], giroY }, material, sombra, eventos, contorno }: { pieza: Caja3D; material: Material; sombra: boolean; eventos: EventosPieza; contorno: boolean }) {
  const geometria = useMemo(() => uvsEnMetros(new BoxGeometry(x, y, z)), [x, y, z])
  useEffect(() => () => geometria.dispose(), [geometria])
  return (
    <mesh castShadow={sombra} receiveShadow position={centro} rotation-y={giroY} geometry={geometria} material={material} {...eventos}>
      {contorno && <Contorno />}
    </mesh>
  )
}

function Cilindro({ pieza: { centro, radio, alto }, material, sombra, eventos, contorno }: { pieza: Cilindro3D; material: Material; sombra: boolean; eventos: EventosPieza; contorno: boolean }) {
  const geometria = useMemo(() => uvsEnMetros(new CylinderGeometry(radio, radio, alto, SEGMENTOS_CILINDRO), { cilindro: radio }), [radio, alto])
  useEffect(() => () => geometria.dispose(), [geometria])
  return (
    <mesh castShadow={sombra} receiveShadow position={centro} geometry={geometria} material={material} {...eventos}>
      {contorno && <Contorno />}
    </mesh>
  )
}

export default function Pieza({ pieza, estado = 'normal', eventos = {}, proyecta = true, contorno = false }: {
  pieza: Pieza3D; estado?: EstadoPieza; eventos?: EventosPieza; proyecta?: boolean; contorno?: boolean
}) {
  const material = materialDe(pieza.material, pieza.color, estado)
  // El cristal de ventana deja pasar la luz: no proyecta sombra.
  const sombra = proyecta && pieza.material !== 'cristal' && pieza.material !== 'mampara'
  switch (pieza.forma) {
    case 'caja':
      return <Caja pieza={pieza} material={material} sombra={sombra} eventos={eventos} contorno={contorno} />
    case 'cilindro':
      return <Cilindro pieza={pieza} material={material} sombra={sombra} eventos={eventos} contorno={contorno} />
    case 'prisma':
      return <Prisma pieza={pieza} material={material} sombra={sombra} eventos={eventos} contorno={contorno} />
  }
}
