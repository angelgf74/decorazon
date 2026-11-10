import { useEffect, useMemo } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import { BoxGeometry, CylinderGeometry, type BufferGeometry, type Material } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { Pieza3D } from '../../nucleo'
import { geometriaExtrusion, geometriaPrisma, geometriaRevolucion, geometriaTubo, uvsEnMetros } from './geometrias'
import { COLOR_SELECCION, materialDe, type EstadoPieza } from './materiales3d'

const SEGMENTOS_CILINDRO = 24
// Con un radio de 5 cm, 3 segmentos dan facetas de 15° cuya sagita es 0,04 cm: no se ve ni en la captura a 2400 px.
const SEGMENTOS_REDONDEO = 3
const GROSOR_CONTORNO_PX = 2
/** En revoluciones, extrusiones y tubos, el contorno solo marca los pliegues de verdad: las facetas de una curva quedan por debajo. */
const UMBRAL_CONTORNO_CURVAS = 35

type Prisma3D = Extract<Pieza3D, { forma: 'prisma' }>
type Caja3D = Extract<Pieza3D, { forma: 'caja' }>
type Cilindro3D = Extract<Pieza3D, { forma: 'cilindro' }>
type EnElemento3D = Extract<Pieza3D, { forma: 'revolucion' | 'extrusion' | 'tubo' }>

export type EventosPieza = Pick<ThreeElements['mesh'], 'onClick' | 'onPointerOver' | 'onPointerOut' | 'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel'>

/**
 * Contorno de la selección: se ve también sobre el rojo de un conflicto. `Edges` pinta las aristas con más de 15° entre
 * caras: sobre una caja redondeada saldrían varias líneas por arista (los escalones del arco), así que una pieza con radio
 * le pasa su caja lisa (`geometria`) y el contorno sigue siendo el envolvente de siempre. Las formas curvas suben el `umbral`.
 */
function Contorno({ geometria, umbral }: { geometria?: BufferGeometry; umbral?: number }) {
  return <Edges geometry={geometria} threshold={umbral} color={COLOR_SELECCION} lineWidth={GROSOR_CONTORNO_PX} />
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

/**
 * Caja y cilindro con las coordenadas de textura en metros (`uvsEnMetros`): la veta no se estira con el tamaño.
 * Una caja con `radio` (m) va con las aristas redondeadas; su contorno de selección se calcula sobre la caja lisa.
 */
function Caja({ pieza: { centro, tamano: [x, y, z], giroY, radio }, material, sombra, eventos, contorno }: { pieza: Caja3D; material: Material; sombra: boolean; eventos: EventosPieza; contorno: boolean }) {
  const geometria = useMemo(() => uvsEnMetros(radio ? new RoundedBoxGeometry(x, y, z, SEGMENTOS_REDONDEO, radio) : new BoxGeometry(x, y, z)), [x, y, z, radio])
  useEffect(() => () => geometria.dispose(), [geometria])
  const lisa = useMemo(() => (contorno && radio ? new BoxGeometry(x, y, z) : undefined), [contorno, radio, x, y, z])
  useEffect(() => () => lisa?.dispose(), [lisa])
  return (
    <mesh castShadow={sombra} receiveShadow position={centro} rotation-y={giroY} geometry={geometria} material={material} {...eventos}>
      {contorno && <Contorno geometria={lisa} />}
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

function geometriaEnElemento(p: EnElemento3D): BufferGeometry {
  switch (p.forma) {
    case 'revolucion':
      return geometriaRevolucion(p.centro, p.perfil, p.lados, p.escalaY)
    case 'extrusion':
      return geometriaExtrusion(p.plano, p.contorno, p.huecos, p.desde, p.hasta, p.radio)
    case 'tubo':
      return geometriaTubo(p.puntos, p.radio, p.codo, p.cerrado)
  }
}

/**
 * Revolución, extrusión y tubo: la geometría va en el sistema del mueble y la malla se coloca en su `origen` con su `giroY`.
 * `pieza` cambia de identidad con cada cambio del elemento (`Mueble3D` la recalcula entonces): no hace falta comparar por valor.
 */
function EnElemento({ pieza, material, sombra, eventos, contorno }: { pieza: EnElemento3D; material: Material; sombra: boolean; eventos: EventosPieza; contorno: boolean }) {
  const geometria = useMemo(() => geometriaEnElemento(pieza), [pieza])
  useEffect(() => () => geometria.dispose(), [geometria])
  return (
    <mesh castShadow={sombra} receiveShadow position={pieza.origen} rotation-y={pieza.giroY} geometry={geometria} material={material} {...eventos}>
      {contorno && <Contorno umbral={UMBRAL_CONTORNO_CURVAS} />}
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
    case 'revolucion':
    case 'extrusion':
    case 'tubo':
      return <EnElemento pieza={pieza} material={material} sombra={sombra} eventos={eventos} contorno={contorno} />
  }
}
