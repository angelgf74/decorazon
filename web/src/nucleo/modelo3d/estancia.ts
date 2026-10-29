import type { Abertura, DocumentoDiseno, Punto } from '../modelo/documento'
import { desplazarPoligono } from '../geometria/poligono'
import { cruz, escalar, longitud, punto, restar, sumar } from '../geometria/vector'
import { hueco, type Hueco } from '../conflictos/estancia'
import { aEscena } from './escena'
import type { MaterialPBR, Pieza3D } from './tipos'

const MARCO_ANCHO_CM = 5
const MARCO_FONDO_CM = 6
const CRISTAL_CM = 1
const HOJA_CM = 4
const MARCO = { material: 'lacado', color: '#f5f3ee' } as const
const CRISTAL = { material: 'cristal', color: '#cfe3ea' } as const
const HOJA = { material: 'madera', color: '#d9c7a8' } as const
const RADIADOR = { material: 'metal', color: '#f2f2f2' } as const
const EPS = 1e-9

export interface EscenaEstancia {
  suelo: Punto[]
  muros: (Pieza3D & { pared: number })[]
  huecos: (Pieza3D & { pared: number })[]
  /** Las piezas pegadas a una pared (radiadores) llevan `pared` para ocultarse con ella. */
  estructura: (Pieza3D & { pared?: number })[]
}

const giro = (d: Punto): number => 0 - Math.atan2(d.y, d.x)
function enPlano(p: Punto): [number, number] {
  const [x, , z] = aEscena(p, 0)
  return [x, z]
}

/** Recorta un polígono convexo al semiplano f ≥ 0 (f lineal). */
function recortar(poligono: Punto[], f: (p: Punto) => number): Punto[] {
  const salida: Punto[] = []
  poligono.forEach((p, k) => {
    const q = poligono[(k + 1) % poligono.length]
    const fp = f(p), fq = f(q)
    if (fp >= 0) salida.push(p)
    if ((fp < 0) !== (fq < 0)) salida.push(sumar(p, escalar(restar(q, p), fp / (fp - fq))))
  })
  return salida
}

/** Quita vértices repetidos, también el último si repite el primero. */
const sinRepetidos = (ps: Punto[]): Punto[] =>
  ps.filter((p, k) => longitud(restar(p, ps[(k + ps.length - 1) % ps.length])) > EPS)

/** Caja alineada con la pared: de `s0` a `s1` a lo largo, de `n0` a `n1` según la normal interior (negativo: dentro del muro) y de `z0` a `z1`. */
function cajaEnPared(
  h: Hueco, s0: number, s1: number, n0: number, n1: number, z0: number, z1: number,
  { material, color }: { material: MaterialPBR; color: string },
): Pieza3D {
  const c = sumar(sumar(h.cercano, escalar(h.d, (s0 + s1) / 2)), escalar(h.n, (n0 + n1) / 2))
  return {
    forma: 'caja', material, color, giroY: giro(h.d),
    centro: aEscena(c, (z0 + z1) / 2),
    tamano: [(s1 - s0) / 100, (z1 - z0) / 100, (n1 - n0) / 100],
  }
}

/** Marco, cristal u hoja de una abertura. `h.cercano` es el arranque del hueco. */
function piezasHueco(h: Hueco, a: Abertura, grosor: number): Pieza3D[] {
  const m = MARCO_ANCHO_CM
  const n0 = -(grosor + MARCO_FONDO_CM) / 2, n1 = -(grosor - MARCO_FONDO_CM) / 2
  const z0 = a.tipo === 'ventana' ? a.alturaSuelo : 0
  const z1 = z0 + a.alto
  const piezas = [
    cajaEnPared(h, 0, m, n0, n1, z0, z1, MARCO),
    cajaEnPared(h, a.ancho - m, a.ancho, n0, n1, z0, z1, MARCO),
    cajaEnPared(h, m, a.ancho - m, n0, n1, z1 - m, z1, MARCO),
  ]
  if (a.tipo === 'ventana') {
    piezas.push(cajaEnPared(h, m, a.ancho - m, n0, n1, z0, z0 + m, MARCO))
    piezas.push(cajaEnPared(h, m, a.ancho - m, -(grosor + CRISTAL_CM) / 2, -(grosor - CRISTAL_CM) / 2, z0 + m, z1 - m, CRISTAL))
  } else {
    piezas.push(cajaEnPared(h, m, a.ancho - m, -HOJA_CM, 0, 0, z1 - m, HOJA))
  }
  return piezas
}

/** Muro de la pared `i`, troceado por sus puertas y ventanas con cortes perpendiculares a la pared. */
function murosDePared(doc: DocumentoDiseno, exterior: Punto[], i: number): Pieza3D[] {
  const { planta, alto, colorParedes } = doc.estancia
  const n = planta.length
  const a = planta[i], b = planta[(i + 1) % n]
  const ea = exterior[i], eb = exterior[(i + 1) % n]
  const L = longitud(restar(b, a))
  const { d } = hueco(planta, i, 0)
  // Huella entera de la pared: trapecio con los ingletes; si la pared es más corta que sus dos ingletes
  // entrantes (se cruzarían), triángulo hasta el punto donde se cortan.
  const t0 = punto(restar(ea, a), d), t1 = punto(restar(eb, a), d)
  const u = restar(ea, a), v = restar(eb, b)
  const entera = t0 > t1
    ? [a, b, sumar(a, escalar(u, cruz(restar(b, a), v) / cruz(u, v)))]
    : [a, b, eb, ea]
  const aLoLargo = (p: Punto): number => punto(restar(p, a), d)
  // Cortes perpendiculares a la pared; en los extremos de la pared manda el inglete.
  const tramo = (s0: number, s1: number, z0: number, z1: number): Pieza3D => {
    let huella = entera
    if (s0 > EPS) huella = recortar(huella, (p) => aLoLargo(p) - s0)
    if (s1 < L - EPS) huella = recortar(huella, (p) => s1 - aLoLargo(p))
    return { forma: 'prisma', material: 'pared', color: colorParedes, huella: sinRepetidos(huella).map(enPlano), y0: z0 / 100, y1: z1 / 100 }
  }

  const aberturas = doc.aberturas.filter((ab) => ab.pared === i).sort((p, q) => p.posicion - q.posicion)
  const piezas: Pieza3D[] = []
  let cursor = 0
  for (const ab of aberturas) {
    const s0 = Math.max(cursor, ab.posicion), s1 = Math.min(L, ab.posicion + ab.ancho)
    if (s0 > cursor + EPS) piezas.push(tramo(cursor, s0, 0, alto))
    if (s1 > s0 + EPS) {
      const base = ab.tipo === 'ventana' ? ab.alturaSuelo : 0
      if (base > EPS) piezas.push(tramo(s0, s1, 0, base))
      if (alto - (base + ab.alto) > EPS) piezas.push(tramo(s0, s1, base + ab.alto, alto))
    }
    cursor = Math.max(cursor, s1)
  }
  if (L > cursor + EPS) piezas.push(tramo(cursor, L, 0, alto))
  return piezas
}

export function escenaEstancia(doc: DocumentoDiseno): EscenaEstancia {
  const { planta, alto, grosorPared, colorParedes } = doc.estancia
  const pared = { material: 'pared', color: colorParedes } as const
  const exterior = desplazarPoligono(planta, grosorPared)

  const muros = planta.flatMap((_, i) => murosDePared(doc, exterior, i).map((m) => ({ ...m, pared: i })))
  const huecos = doc.aberturas.flatMap((ab) =>
    piezasHueco(hueco(planta, ab.pared, ab.posicion), ab, grosorPared).map((p) => ({ ...p, pared: ab.pared })))

  const estructura = doc.estructura.map((e): Pieza3D & { pared?: number } => {
    if (e.tipo === 'columna') {
      return {
        forma: 'caja', ...pared, giroY: 0 - (e.rotacion * Math.PI) / 180,
        centro: aEscena(e.centro, alto / 2), tamano: [e.ancho / 100, alto / 100, e.fondo / 100],
      }
    }
    if (e.tipo === 'viga') {
      const v = restar(e.hasta, e.desde)
      return {
        forma: 'caja', ...pared, giroY: giro(v),
        centro: aEscena(escalar(sumar(e.desde, e.hasta), 0.5), alto - e.canto / 2),
        tamano: [longitud(v) / 100, e.canto / 100, e.ancho / 100],
      }
    }
    const h = hueco(planta, e.pared, e.posicion)
    return { ...cajaEnPared(h, 0, e.ancho, 0, e.fondo, e.alturaSuelo, e.alturaSuelo + e.alto, RADIADOR), pared: e.pared }
  })

  return { suelo: planta, muros, huecos, estructura }
}
