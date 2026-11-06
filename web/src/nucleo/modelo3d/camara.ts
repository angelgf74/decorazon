import type { DocumentoDiseno, Punto } from '../modelo/documento'
import { cajaPlanta, contienePunto } from '../geometria/poligono'
import { hueco } from '../conflictos/estancia'
import { escalar, longitud, normalizar, punto, restar, sumar } from '../geometria/vector'
import type { Vec3 } from './tipos'

const ALTURA_OBJETIVO_M = 1
const COS45 = Math.SQRT1_2

export function camaraInicial(doc: DocumentoDiseno): { posicion: Vec3; objetivo: Vec3; distanciaMin: number; distanciaMax: number } {
  const c = cajaPlanta(doc.estancia.planta)
  const diagonal = Math.hypot(c.maxX - c.minX, c.maxY - c.minY) / 100
  const objetivo: Vec3 = [(c.minX + c.maxX) / 200, ALTURA_OBJETIVO_M, (c.minY + c.maxY) / 200]
  const d = 1.6 * diagonal
  // Delante a la izquierda (−x, +z) con 45° de elevación.
  const posicion: Vec3 = [objetivo[0] - d * COS45 * COS45, objetivo[1] + d * COS45, objetivo[2] + d * COS45 * COS45]
  return { posicion, objetivo, distanciaMin: 1, distanciaMax: 3 * diagonal }
}

/** Normal exterior de la pared: la horaria con y hacia abajo tiene el interior a la derecha de d. */
function normalExterior(planta: Punto[], pared: number): Punto {
  const { d } = hueco(planta, pared, 0)
  return { x: d.y, y: -d.x }
}

/** Altura de los ojos y cuánto se entra desde la puerta, en metros (si así se saliera de la planta, menos). */
const ALTURA_OJOS_M = 1.6
const ENTRADAS_CM = [60, 30, 15, 5]
/**
 * El objetivo queda a un centímetro: los controles orbitan alrededor de él y con ese radio la cámara no se mueve
 * (con un metro andaría hasta dos y atravesaría paredes). Mirada 10° hacia abajo, sea cual sea el tamaño de la estancia.
 */
export const DISTANCIA_MIRADA_M = 0.01
const CABECEO_RAD = (-10 * Math.PI) / 180

/**
 * La cámara como al entrar por la puerta: a la altura de los ojos, 0,6 m dentro desde el centro de la primera puerta
 * (sin puerta, desde el centro de la pared 0) y con el rumbo hacia el centro de la estancia, 10° hacia abajo. El objetivo
 * es el punto a un centímetro en esa dirección: orbitar alrededor de él es girar la cabeza.
 */
export function camaraDesdeDentro(doc: DocumentoDiseno): { posicion: Vec3; objetivo: Vec3 } {
  const { planta } = doc.estancia
  const puerta = doc.aberturas.find((a) => a.tipo === 'puerta')
  const pared = puerta?.pared ?? 0
  const a = planta[pared]!, b = planta[(pared + 1) % planta.length]!
  const enPared = puerta ? puerta.posicion + puerta.ancho / 2 : Math.hypot(b.x - a.x, b.y - a.y) / 2
  const { cercano, n } = hueco(planta, pared, enPared)
  // En un rincón agudo o un paso estrecho, 60 cm se salen de la planta: se entra lo que quepa.
  const pies = ENTRADAS_CM.map((cm) => sumar(cercano, escalar(n, cm)))
  const pie = pies.find((p) => contienePunto(planta, p)) ?? pies[pies.length - 1]!
  const posicion: Vec3 = [pie.x / 100, ALTURA_OJOS_M, pie.y / 100]
  const c = cajaPlanta(planta)
  const centro = { x: (c.minX + c.maxX) / 2, y: (c.minY + c.maxY) / 2 }
  // Rumbo horizontal hacia el centro; si la cámara está justo en él, hacia dentro de la pared.
  const haciaCentro = restar(centro, pie)
  const rumbo = longitud(haciaCentro) < 1 ? n : normalizar(haciaCentro)
  const objetivo: Vec3 = [
    posicion[0] + rumbo.x * Math.cos(CABECEO_RAD) * DISTANCIA_MIRADA_M,
    posicion[1] + Math.sin(CABECEO_RAD) * DISTANCIA_MIRADA_M,
    posicion[2] + rumbo.y * Math.cos(CABECEO_RAD) * DISTANCIA_MIRADA_M,
  ]
  return { posicion, objetivo }
}

export function direccionSol(doc: DocumentoDiseno): Vec3 {
  let ancha: { pared: number; ancho: number } | undefined
  for (const a of doc.aberturas) {
    if (a.tipo === 'ventana' && (!ancha || a.ancho > ancha.ancho)) ancha = { pared: a.pared, ancho: a.ancho }
  }
  if (!ancha) {
    return normalizar3([-1, 1.5, -0.7])
  }
  const n = normalExterior(doc.estancia.planta, ancha.pared)
  return [n.x * COS45, COS45, n.y * COS45]
}

function normalizar3(v: Vec3): Vec3 {
  const l = Math.hypot(...v)
  return [v[0] / l, v[1] / l, v[2] / l]
}

/** Paredes cuya normal exterior mira a la cámara (coordenadas del plano, cm). */
export function paredesQueTapan(planta: Punto[], camara: Punto): number[] {
  const tapan: number[] = []
  planta.forEach((a, i) => {
    const b = planta[(i + 1) % planta.length]
    const nExt = normalExterior(planta, i)
    const medio = escalar(sumar(a, b), 0.5)
    if (punto(nExt, restar(camara, medio)) > 0) tapan.push(i)
  })
  return tapan
}

/** Posición de la cámara (metros de la escena) en el plano (cm). */
export function camaraAPlano(v: Vec3): Punto {
  return { x: v[0] * 100, y: v[2] * 100 }
}
