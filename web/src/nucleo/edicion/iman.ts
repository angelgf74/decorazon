import type { Catalogo, DefinicionTipo } from '../catalogo/tipos'
import { obstaculosDeEstructura, penetracionEnParedes } from '../conflictos/estancia'
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
  // El eje de cada pared pegada: si la estructura lo aparta por ese eje, deja de estar pegado a ella.
  const ejeDePared = new Map<string, number>()
  const pegar = (t: Tramo) => {
    const h = hueco(t, rect(), posicion)
    if (h === null) return
    posicion = sumar(posicion, escalar(t.normal, -h))
    pegadoA.push(`pared:${t.i}`)
    const [ux, uy] = ejesLocales(rotacion)
    const eje = Math.abs(punto(t.normal, ux)) >= Math.abs(punto(t.normal, uy)) ? 0 : 1
    bloqueados.add(eje)
    ejeDePared.set(`pared:${t.i}`, eje)
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

  if (defE) {
    const r = conEstructura(doc, defE, { ...e, rotacion }, posicion, ejes, {
      bloqueados,
      // Con las paredes de antes (al editar medidas o giro) solo se pega a ellas: lo que tenía cerca no lo atrae.
      atraer: !opciones.paredes && !pisable(e),
      // Lo que va colgado (un cuadro, un módulo alto) no se separa de su pared: se queda con su aviso.
      apartarDePared: e.alturaSuelo <= 0,
      vecinos: objetivos.flatMap(volumenes),
    })
    posicion = r.posicion
    pegadoA.push(...r.pegadoA)
    if (r.ejeApartado !== undefined) {
      for (const [pared, eje] of ejeDePared) {
        if (eje === r.ejeApartado) pegadoA.splice(pegadoA.indexOf(pared), 1)
      }
    }
  }

  return { posicion: redondearNumeros(posicion), rotacion, pegadoA }
}

/** Solape de dos intervalos (negativo si no se tocan). */
const solape = ([a0, a1]: [number, number], [b0, b1]: [number, number]) => Math.min(a1, b1) - Math.max(a0, b0)

interface OpcionesEstructura {
  /** Ejes ya pegados a una pared: no se atrae por ellos. */
  bloqueados: Set<number>
  /** Si se atrae a la estructura cercana (no con las paredes de antes, ni lo pisable). */
  atraer: boolean
  /** Si se puede apartar por un eje pegado a una pared (no lo que va colgado). */
  apartarDePared: boolean
  /** Los volúmenes de los muebles con los que chocaría: apartarlo no puede meterlo en uno. */
  vecinos: Prisma[]
}

/**
 * Columnas y vigas, con su volumen real (la viga, desde el techo hacia abajo) frente al del mueble (la L de un
 * esquinero, con su hueco): por los ejes libres, lo acerca hasta tocar una que tenga a IMAN_CM o menos; y si choca
 * con alguna, lo aparta lo mínimo por cualquiera de sus dos ejes, aunque eso lo separe de una pared, siempre que no
 * pase de IMAN_CM, no choque con otra ni con un mueble ni se salga de la estancia. Si no hay manera, se queda (y sale
 * el aviso). Con piezas giradas respecto al mueble (una viga en diagonal) el solape por proyecciones es una cota por
 * arriba: en la práctica, solo se ajusta a lo que va alineado con él.
 */
function conEstructura(
  doc: DocumentoDiseno, def: DefinicionTipo, e: Elemento, inicio: Punto, ejes: [Punto, Punto], opciones: OpcionesEstructura,
): { posicion: Punto; pegadoA: string[]; ejeApartado?: number } {
  const estructura = obstaculosDeEstructura(doc).filter(o => o.nombre === 'columna' || o.nombre === 'viga')
  const pegadoA: string[] = []
  if (estructura.length === 0) return { posicion: inicio, pegadoA }
  const { bloqueados } = opciones
  const volumenes = (p: Punto) => def.volumenes({ ...e, posicion: p })
  const solapanEnAltura = (v: Prisma, o: Prisma) => Math.min(v.zMax, o.zMax) - Math.max(v.zMin, o.zMin) > TOLERANCIA_CM
  const choques = (vs: Prisma[]) => estructura.filter(o => vs.some(v => penetracion3D(v, o.prisma) > TOLERANCIA_CM))
  const planta = doc.estancia.planta
  // La misma regla que el aviso de salirse de la estancia.
  const valida = (p: Punto) => {
    const vs = volumenes(p)
    return choques(vs).length === 0
      && vs.every(v => penetracionEnParedes(planta, v.huella) <= TOLERANCIA_CM)
      && !vs.some(v => opciones.vecinos.some(w => penetracion3D(v, w) > TOLERANCIA_CM))
  }
  let posicion = inicio

  // 1. Atraer por los ejes libres: lo que chocaría si siguiera moviéndose por ese eje, a IMAN_CM o menos.
  if (opciones.atraer && choques(volumenes(posicion)).length === 0) {
    ejes.forEach((u, k) => {
      if (bloqueados.has(k)) return
      const w = ejes[1 - k]
      let mejor: { id: string; d: number } | undefined
      for (const v of volumenes(posicion)) {
        for (const o of estructura) {
          if (!solapanEnAltura(v, o.prisma) || solape(proyeccion(v.huella, w), proyeccion(o.prisma.huella, w)) <= EPS) continue
          const [a0, a1] = proyeccion(v.huella, u)
          const [b0, b1] = proyeccion(o.prisma.huella, u)
          const d = b0 >= a1 - EPS ? b0 - a1 : a0 >= b1 - EPS ? b1 - a0 : null
          if (d !== null && Math.abs(d) <= IMAN_CM && (!mejor || Math.abs(d) < Math.abs(mejor.d))) mejor = { id: o.id, d }
        }
      }
      const destino = mejor && sumar(posicion, escalar(u, mejor.d))
      if (mejor && destino && valida(destino)) {
        posicion = destino
        pegadoA.push(`estructura:${mejor.id}`)
      }
    })
  }

  // 2. Apartar: el desplazamiento más pequeño, por cualquiera de los dos ejes, que lo deje tocando sin chocar.
  const actuales = volumenes(posicion)
  const chocan = choques(actuales)
  let ejeApartado: number | undefined
  if (chocan.length > 0) {
    const candidatos: { d: Punto; largo: number; eje: number }[] = []
    for (const [eje, u] of ejes.entries()) {
      if (!opciones.apartarDePared && bloqueados.has(eje)) continue
      for (const v of actuales) {
        for (const o of chocan) {
          if (penetracion3D(v, o.prisma) <= TOLERANCIA_CM) continue
          const [a0, a1] = proyeccion(v.huella, u)
          const [b0, b1] = proyeccion(o.prisma.huella, u)
          for (const d of [b1 - a0, b0 - a1]) candidatos.push({ d: escalar(u, d), largo: Math.abs(d), eje })
        }
      }
    }
    const elegido = candidatos
      .filter(c => c.largo <= IMAN_CM + EPS)
      .sort((a, b) => a.largo - b.largo)
      .find(c => valida(sumar(posicion, c.d)))
    if (elegido) {
      posicion = sumar(posicion, elegido.d)
      for (const o of chocan) pegadoA.push(`estructura:${o.id}`)
      if (elegido.largo > EPS) ejeApartado = elegido.eje
    }
  }
  return { posicion, pegadoA, ...(ejeApartado !== undefined && { ejeApartado }) }
}
