import type { DocumentoDiseno } from '../modelo/documento'
import type { ZonaApertura } from '../catalogo/tipos'
import { rectangulo, sectorCircunscrito } from '../geometria/formas'
import { contienePunto, distanciaAlBorde } from '../geometria/poligono'
import type { Prisma } from '../geometria/prisma'
import { TOLERANCIA_CM } from '../geometria/tolerancia'
import { escalar, normalizar, restar, sumar, type Punto } from '../geometria/vector'

export interface Obstaculo { id: string; nombre: string; genero: 'm' | 'f'; prisma: Prisma }
export interface ObstaculosEstancia {
  fisicos: Obstaculo[]
  protegidos: Obstaculo[]
  aperturas: (ZonaApertura & { id: string })[]
}

const FRANJA_CM = 10

const angulo = (v: Punto): number => (Math.atan2(v.y, v.x) * 180) / Math.PI

interface Hueco { cercano: Punto; d: Punto; n: Punto }

/** Marco de una pared: punto cercano del hueco, dirección y normal interior. */
function hueco(planta: Punto[], pared: number, posicion: number): Hueco {
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
      aperturas.push({ id: a.id, nombre: 'la puerta', huella: franja(h, a.ancho, 0, FRANJA_CM), ...z })
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

/** Cuánto se sale una huella convexa de la planta (0 si está dentro). */
export function penetracionEnParedes(planta: Punto[], huella: Punto[]): number {
  let max = 0
  for (const q of huella) {
    if (!contienePunto(planta, q)) max = Math.max(max, distanciaAlBorde(planta, q))
  }
  for (const q of planta) {
    if (contienePunto(huella, q)) {
      const d = distanciaAlBorde(huella, q)
      if (d > TOLERANCIA_CM) max = Math.max(max, d)
    }
  }
  return max
}
