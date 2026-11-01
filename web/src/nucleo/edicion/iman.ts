import type { Catalogo } from '../catalogo/tipos'
import { rectangulo } from '../geometria/formas'
import { penetracion3D, type Prisma } from '../geometria/prisma'
import { TOLERANCIA_CM } from '../geometria/tolerancia'
import { escalar, longitud, normalizar, punto, restar, rotar, sumar, type Punto } from '../geometria/vector'
import type { DocumentoDiseno, Elemento } from '../modelo/documento'
import { redondearNumeros } from './serializar'

export const IMAN_CM = 15
/** Con giro libre, lo más que el imán endereza un elemento para alinearlo con una pared. */
const DESVIO_LIBRE = 5
const EPS = 1e-6

interface Tramo { i: number; a: Punto; d: Punto; normal: Punto; largo: number }

export const normalizarGiro = (g: number): number => ((g % 360) + 360) % 360
const anguloDe = (d: Punto) => (Math.atan2(d.y, d.x) * 180) / Math.PI
const mismoGiroMod90 = (a: number, b: number) => {
  const r = (((a - b) % 90) + 90) % 90
  return r < EPS || r > 90 - EPS
}
function proyeccion(rect: Punto[], u: Punto): [number, number] {
  const p = rect.map(v => punto(v, u))
  return [Math.min(...p), Math.max(...p)]
}

const ejesLocales = (rotacion: number): [Punto, Punto] => [rotar({ x: 1, y: 0 }, rotacion), rotar({ x: 0, y: 1 }, rotacion)]

function tramos(planta: Punto[]): Tramo[] {
  return planta.map((a, i) => {
    const e = restar(planta[(i + 1) % planta.length], a)
    const d = normalizar(e)
    return { i, a, d, normal: { x: -d.y, y: d.x }, largo: longitud(e) }
  })
}

/** Hueco del rectángulo a la recta del tramo por su normal interior; null si no se solapan a lo largo del tramo o el centro queda fuera. */
function hueco(t: Tramo, rect: Punto[], centro: Punto): number | null {
  const [desde, hasta] = proyeccion(rect.map(v => restar(v, t.a)), t.d)
  if (hasta <= EPS || desde >= t.largo - EPS) return null
  if (punto(restar(centro, t.a), t.normal) <= 0) return null
  return Math.min(...rect.map(v => punto(restar(v, t.a), t.normal)))
}

/** Paredes que `e` toca: a no más de TOLERANCIA_CM, o metido en ellas hasta IMAN_CM. */
export function paredesTocadas(doc: DocumentoDiseno, e: Elemento): number[] {
  const rect = rectangulo(e.posicion, e.medidas.ancho, e.medidas.fondo, e.rotacion)
  return tramos(doc.estancia.planta)
    .filter(t => {
      const h = hueco(t, rect, e.posicion)
      return h !== null && h <= TOLERANCIA_CM && h >= -IMAN_CM
    })
    .map(t => t.i)
}

/**
 * Ajusta el giro y la posición de `e` (ya colocado donde lo pide el usuario): lo pega a la pared más cercana, y a una
 * segunda perpendicular para encajarlo en la esquina, y por los ejes que queden libres a otro mueble con el mismo giro
 * con el que chocaría (ni pisable ni a otra altura).
 * Con `paredes`, lo pega a esas paredes (las que ya tocaba antes de editarlo) estén a la distancia que estén.
 */
export function imantar(
  doc: DocumentoDiseno, catalogo: Catalogo, e: Elemento, opciones: { libre: boolean; paredes?: number[] },
): { posicion: Punto; rotacion: number; pegadoA: string[] } {
  const { libre } = opciones
  const { ancho, fondo } = e.medidas
  let rotacion = normalizarGiro(libre ? Math.round(e.rotacion) : Math.round(e.rotacion / 90) * 90)
  let posicion = { ...e.posicion }
  const rect = () => rectangulo(posicion, ancho, fondo, rotacion)
  const pegadoA: string[] = []
  // Ejes locales (0 = x, 1 = y) que ya quedaron pegados a una pared.
  const bloqueados = new Set<number>()

  const alinear = (t: Tramo): number | null => {
    const angulo = anguloDe(t.d)
    const objetivo = angulo + Math.round((rotacion - angulo) / 90) * 90
    if (libre && Math.abs(objetivo - rotacion) > DESVIO_LIBRE) return null
    return normalizarGiro(Math.round(objetivo))
  }
  const masCercano = (candidatos: Tramo[]): Tramo | undefined => {
    let mejor: { t: Tramo; h: number } | undefined
    for (const t of candidatos) {
      const h = hueco(t, rect(), posicion)
      if (h !== null && Math.abs(h) <= IMAN_CM && (!mejor || Math.abs(h) < Math.abs(mejor.h))) mejor = { t, h }
    }
    return mejor?.t
  }
  const pegar = (t: Tramo) => {
    const h = hueco(t, rect(), posicion)
    if (h === null) return
    posicion = sumar(posicion, escalar(t.normal, -h))
    pegadoA.push(`pared:${t.i}`)
    const [ux, uy] = ejesLocales(rotacion)
    bloqueados.add(Math.abs(punto(t.normal, ux)) >= Math.abs(punto(t.normal, uy)) ? 0 : 1)
  }

  const lista = tramos(doc.estancia.planta)
  const forzadas = (opciones.paredes ?? []).flatMap(i => lista[i] ?? []).filter(t => alinear(t) !== null)
  const primera = forzadas.length > 0 ? undefined : masCercano(lista.filter(t => alinear(t) !== null))
  if (forzadas.length > 0) {
    rotacion = alinear(forzadas[0]) ?? rotacion
    forzadas.forEach(pegar)
  } else if (primera) {
    rotacion = alinear(primera) ?? rotacion
    pegar(primera)
    const segunda = masCercano(lista.filter(t => t !== primera && Math.abs(punto(t.d, primera.d)) < EPS))
    if (segunda) pegar(segunda)
  }

  // Entre muebles solo atrae lo que chocaría: ni lo pisable (una alfombra) ni lo que va a otra altura (un módulo alto
  // sobre uno bajo).
  const pisable = (x: Elemento) => catalogo.get(x.tipo)?.pisable === true
  const solapanEnAltura = (o: Elemento) =>
    Math.min(e.alturaSuelo + e.medidas.alto, o.alturaSuelo + o.medidas.alto) - Math.max(e.alturaSuelo, o.alturaSuelo) > TOLERANCIA_CM
  const objetivos = pisable(e) ? [] : doc.elementos.filter(o => o.id !== e.id && !pisable(o) && solapanEnAltura(o))
  // Lo que ya se cruza en planta sin chocar de verdad (una silla bajo una mesa) está bien colocado: no se empuja fuera.
  const defE = catalogo.get(e.tipo)
  const volumenes = (x: Elemento): Prisma[] => catalogo.get(x.tipo)?.volumenes(x) ?? []
  const chocan = (a: Prisma[], b: Prisma[]) => a.some(x => b.some(y => penetracion3D(x, y) > TOLERANCIA_CM))
  const ejes = ejesLocales(rotacion)
  ejes.forEach((u, k) => {
    if (bloqueados.has(k)) return
    const v = ejes[1 - k]
    const propio = rect()
    const [a0, a1] = proyeccion(propio, u)
    const [c0, c1] = proyeccion(propio, v)
    let mejor: { id: string; desplazamiento: number } | undefined
    for (const o of objetivos) {
      if (!mismoGiroMod90(o.rotacion, rotacion)) continue
      const otro = rectangulo(o.posicion, o.medidas.ancho, o.medidas.fondo, o.rotacion)
      const [b0, b1] = proyeccion(otro, u)
      const [d0, d1] = proyeccion(otro, v)
      if (Math.min(c1, d1) - Math.max(c0, d0) <= EPS) continue
      const enPlanta = Math.min(a1, b1) - Math.max(a0, b0) > EPS
      if (enPlanta && defE && !chocan(defE.volumenes({ ...e, posicion, rotacion }), volumenes(o))) continue
      const desplazamiento = b0 + b1 > a0 + a1 ? b0 - a1 : b1 - a0
      if (Math.abs(desplazamiento) <= IMAN_CM && (!mejor || Math.abs(desplazamiento) < Math.abs(mejor.desplazamiento))) {
        mejor = { id: o.id, desplazamiento }
      }
    }
    if (mejor) {
      posicion = sumar(posicion, escalar(u, mejor.desplazamiento))
      pegadoA.push(mejor.id)
    }
  })

  return { posicion: redondearNumeros(posicion), rotacion, pegadoA }
}
