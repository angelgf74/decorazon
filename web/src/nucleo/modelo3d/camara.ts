import type { DocumentoDiseno, Punto } from '../modelo/documento'
import { cajaPlanta } from '../geometria/poligono'
import { hueco } from '../conflictos/estancia'
import { punto, restar, sumar, escalar } from '../geometria/vector'
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
