import type { DocumentoDiseno } from '../modelo/documento'
import type { ZonaApertura } from '../catalogo/tipos'
import { rectangulo, sectorCircunscrito } from '../geometria/formas'
import { areaConSigno, contienePunto, distanciaAlBorde } from '../geometria/poligono'
import type { Prisma } from '../geometria/prisma'
import { PASO_MINIMO_CM } from './constantes'
import { TOLERANCIA_CM } from '../geometria/tolerancia'
import { cruz, escalar, longitud, normalizar, restar, sumar, type Punto } from '../geometria/vector'

export interface Obstaculo { id: string; nombre: string; genero: 'm' | 'f'; prisma: Prisma }
export interface ObstaculosEstancia {
  fisicos: Obstaculo[]
  protegidos: Obstaculo[]
  aperturas: (ZonaApertura & { id: string })[]
}

/** Fondo de la franja protegida delante de ventanas y radiadores. */
const FRANJA_CM = 10

const angulo = (v: Punto): number => (Math.atan2(v.y, v.x) * 180) / Math.PI

export interface Hueco { cercano: Punto; d: Punto; n: Punto }

/** Marco de una pared: punto cercano del hueco, dirección y normal interior. */
export function hueco(planta: Punto[], pared: number, posicion: number): Hueco {
  const a = planta[pared], b = planta[(pared + 1) % planta.length]
  const d = normalizar(restar(b, a))
  return { cercano: sumar(a, escalar(d, posicion)), d, n: { x: -d.y, y: d.x } }
}

/** Rectángulo alineado con la pared: `ancho` a lo largo, de `desde` a `hasta` de fondo hacia dentro. */
function franja(h: Hueco, ancho: number, desde: number, hasta: number): Punto[] {
  const centro = sumar(sumar(h.cercano, escalar(h.d, ancho / 2)), escalar(h.n, (desde + hasta) / 2))
  return rectangulo(centro, ancho, hasta - desde, angulo(h.d))
}

export function obstaculosDeEstancia(doc: DocumentoDiseno): ObstaculosEstancia {
  const { planta, alto } = doc.estancia
  const fisicos: Obstaculo[] = []
  const protegidos: Obstaculo[] = []
  const aperturas: (ZonaApertura & { id: string })[] = []

  for (const e of doc.estructura) {
    if (e.tipo === 'columna') {
      fisicos.push({ id: e.id, nombre: 'columna', genero: 'f', prisma: { huella: rectangulo(e.centro, e.ancho, e.fondo, e.rotacion), zMin: 0, zMax: alto } })
    } else if (e.tipo === 'viga') {
      const v = restar(e.hasta, e.desde)
      const medio = escalar(sumar(e.desde, e.hasta), 0.5)
      fisicos.push({ id: e.id, nombre: 'viga', genero: 'f', prisma: { huella: rectangulo(medio, Math.hypot(v.x, v.y), e.ancho, angulo(v)), zMin: alto - e.canto, zMax: alto } })
    } else {
      const h = hueco(planta, e.pared, e.posicion)
      const z = { zMin: e.alturaSuelo, zMax: e.alturaSuelo + e.alto }
      fisicos.push({ id: e.id, nombre: 'radiador', genero: 'm', prisma: { huella: franja(h, e.ancho, 0, e.fondo), ...z } })
      protegidos.push({ id: e.id, nombre: 'radiador', genero: 'm', prisma: { huella: franja(h, e.ancho, e.fondo, e.fondo + FRANJA_CM), ...z } })
    }
  }

  for (const a of doc.aberturas) {
    const h = hueco(planta, a.pared, a.posicion)
    if (a.tipo === 'puerta') {
      const z = { zMin: 0, zMax: a.alto }
      // Toda puerta (corredera o abatible, hacia dentro o hacia fuera) necesita un paso libre delante del hueco.
      aperturas.push({ id: a.id, nombre: 'la puerta', huella: franja(h, a.ancho, 0, PASO_MINIMO_CM), ...z })
      if (a.hoja === 'abatible' && a.abreHacia === 'dentro') {
        const ang = angulo(h.d)
        const sector = a.bisagra === 'izquierda'
          ? sectorCircunscrito(h.cercano, a.ancho, ang, ang + 90)
          : sectorCircunscrito(sumar(h.cercano, escalar(h.d, a.ancho)), a.ancho, ang + 90, ang + 180)
        aperturas.push({ id: a.id, nombre: 'la puerta', huella: sector, ...z })
      }
    } else {
      const z = { zMin: a.alturaSuelo, zMax: a.alturaSuelo + a.alto }
      protegidos.push({ id: a.id, nombre: 'ventana', genero: 'f', prisma: { huella: franja(h, a.ancho, 0, FRANJA_CM), ...z } })
      if (a.abreHaciaDentro) {
        aperturas.push({ id: a.id, nombre: 'la ventana', huella: franja(h, a.ancho, 0, a.ancho / 2), ...z })
      }
    }
  }

  return { fisicos, protegidos, aperturas }
}

/** Punto estrictamente dentro de la huella: a más de TOLERANCIA_CM de su borde. */
const dentroDe = (huella: Punto[], q: Punto): boolean => contienePunto(huella, q) && distanciaAlBorde(huella, q) > TOLERANCIA_CM

/** Longitud del trozo del segmento a-b que queda dentro de la huella convexa (borde incluido). */
function longitudDentro(huella: Punto[], a: Punto, b: Punto): number {
  const sentido = areaConSigno(huella) >= 0 ? 1 : -1
  const ab = restar(b, a)
  let t0 = 0, t1 = 1
  for (let k = 0; k < huella.length; k++) {
    const p = huella[k], q = huella[(k + 1) % huella.length]
    const borde = normalizar(restar(q, p))
    // Distancia con signo al lado interior de la arista (positiva dentro), lineal en t.
    const fa = sentido * cruz(borde, restar(a, p))
    const fb = sentido * cruz(borde, restar(b, p))
    if (fa < 0 && fb < 0) return 0
    if (fa < 0) t0 = Math.max(t0, fa / (fa - fb))
    else if (fb < 0) t1 = Math.min(t1, fa / (fa - fb))
    if (t0 >= t1) return 0
  }
  return (t1 - t0) * longitud(ab)
}

/**
 * Cuánto se sale una huella convexa de la planta (0 si está dentro), como el máximo de tres reglas:
 * (a) distancia a la planta del vértice de la huella que queda más fuera;
 * (b) distancia al borde de la huella del vértice de la planta que queda más dentro de ella;
 * (c) para cada tramo de la planta que cruza la huella de lado a lado (un tabique que la atraviesa sin dejar
 *     vértices dentro ni fuera), lo que hay que mover la huella para dejarla entera a un lado de la recta del
 *     tramo: el mínimo de su extensión a cada lado. Solo si ningún extremo del tramo queda dentro de la huella
 *     (a más de TOLERANCIA_CM de su borde): si un extremo queda dentro, el tramo acaba ahí, la recta no es pared
 *     más allá y ese caso ya lo mide (b) (en una esquina entrante, la recta entera exageraría la cifra).
 * No considera el grosor de un tabique (sus dos caras se miden por separado) ni salir por el extremo de un tramo.
 * Puede devolver valores por debajo de 1 mm por ruido o por tocar el borde; el llamante compara con > TOLERANCIA_CM.
 */
export function penetracionEnParedes(planta: Punto[], huella: Punto[]): number {
  let max = 0
  for (const q of huella) {
    if (!contienePunto(planta, q)) max = Math.max(max, distanciaAlBorde(planta, q))
  }
  for (const q of planta) {
    if (dentroDe(huella, q)) max = Math.max(max, distanciaAlBorde(huella, q))
  }
  for (let k = 0; k < planta.length; k++) {
    const a = planta[k], b = planta[(k + 1) % planta.length]
    if (dentroDe(huella, a) || dentroDe(huella, b)) continue
    if (longitudDentro(huella, a, b) <= TOLERANCIA_CM) continue
    const d = normalizar(restar(b, a))
    let izquierda = 0, derecha = 0
    for (const q of huella) {
      const lado = cruz(d, restar(q, a))
      izquierda = Math.max(izquierda, lado)
      derecha = Math.max(derecha, -lado)
    }
    max = Math.max(max, Math.min(izquierda, derecha))
  }
  return max
}
