import { textos } from '../../textos'
import { areaConSigno, esSimple } from '../geometria/poligono'
import { escalar, longitud, normalizar, punto, restar, sumar, type Punto } from '../geometria/vector'
import type { DocumentoDiseno, Estructura, Radiador } from '../modelo/documento'
import { validarDocumento } from '../modelo/validar'
import type { ResultadoEdicion } from './resultado'

const EPS = 1e-9
const PARED_MINIMA_CM = 10

type EnPared = { pared: number; posicion: number; ancho: number }
/** Nueva pared y posición de un hueco (abertura o radiador), o el motivo para rechazar el cambio. */
type Reubicar = (h: EnPared) => { pared: number; posicion: number } | string

const falla = (motivo: string): ResultadoEdicion => ({ ok: false, motivo })
const indiceValido = (planta: Punto[], i: number) => Number.isInteger(i) && i >= 0 && i < planta.length
const esRadiador = (e: Estructura): e is Radiador => e.tipo === 'radiador'
const huecos = (doc: DocumentoDiseno): EnPared[] => [...doc.aberturas, ...doc.estructura.filter(esRadiador)]

export function longitudPared(planta: Punto[], i: number): number {
  return longitud(restar(planta[(i + 1) % planta.length], planta[i]))
}

function orientacion(planta: Punto[], i: number): 'h' | 'v' | null {
  const u = restar(planta[(i + 1) % planta.length], planta[i])
  if (Math.abs(u.y) < EPS && Math.abs(u.x) >= EPS) return 'h'
  if (Math.abs(u.x) < EPS && Math.abs(u.y) >= EPS) return 'v'
  return null
}

export function esRectangular(planta: Punto[]): boolean {
  if (planta.length !== 4) return false
  return planta.every((_, i) => {
    const o = orientacion(planta, i)
    return o !== null && o !== orientacion(planta, (i + 1) % 4)
  })
}

const mismoPunto = (a: Punto, b: Punto) => Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS

/**
 * Con la misma cantidad de vértices, cada hueco se ancla al extremo de su pared que no se mueve: si se movió solo
 * el inicio, la posición (medida desde el inicio) se corrige con lo que cambió la longitud; si no, se conserva.
 */
function anclarAlExtremoFijo(antes: Punto[], despues: Punto[]): Reubicar {
  return h => {
    if (!indiceValido(antes, h.pared) || antes.length !== despues.length) return { pared: h.pared, posicion: h.posicion }
    const j = (h.pared + 1) % antes.length
    const inicioMovido = !mismoPunto(antes[h.pared], despues[h.pared])
    const finalMovido = !mismoPunto(antes[j], despues[j])
    if (!inicioMovido || finalMovido) return { pared: h.pared, posicion: h.posicion }
    return { pared: h.pared, posicion: Math.round(h.posicion + longitudPared(despues, h.pared) - longitudPared(antes, h.pared)) }
  }
}

/** Aplica la planta nueva y la reubicación de huecos, y comprueba las reglas comunes. Nunca muta `doc`. */
function aplicar(doc: DocumentoDiseno, planta: Punto[], reubicar: Reubicar = anclarAlExtremoFijo(doc.estancia.planta, planta)): ResultadoEdicion {
  let motivo: string | null = null
  const mover = <T extends EnPared>(h: T): T => {
    const r = reubicar(h)
    if (typeof r === 'string') { motivo ??= r; return h }
    return { ...h, ...r }
  }
  const nuevo: DocumentoDiseno = {
    ...doc,
    estancia: { ...doc.estancia, planta },
    aberturas: doc.aberturas.map(mover),
    estructura: doc.estructura.map(e => (esRadiador(e) ? mover(e) : e)),
  }
  if (motivo !== null) return falla(motivo)
  return comprobarEstancia(nuevo)
}

/** Reglas comunes de toda edición de la estancia: planta simple, paredes ≥ 10 cm, huecos dentro de su pared y documento válido. */
export function comprobarEstancia(nuevo: DocumentoDiseno): ResultadoEdicion {
  const planta = nuevo.estancia.planta
  if (!planta.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))) return falla(textos.edicion.cambioNoValido)
  if (!esSimple(planta) || areaConSigno(planta) <= 0) return falla(textos.edicion.plantaCruzada)
  if (planta.some((_, i) => longitudPared(planta, i) < PARED_MINIMA_CM)) return falla(textos.edicion.paredCorta)
  const cabe = (h: EnPared) =>
    indiceValido(planta, h.pared) && h.posicion >= 0 && h.posicion + h.ancho <= longitudPared(planta, h.pared) + EPS
  if (!huecos(nuevo).every(cabe)) return falla(textos.edicion.noCabeEnPared)
  if (!validarDocumento(nuevo).valido) return falla(textos.edicion.cambioNoValido)
  return { ok: true, documento: nuevo }
}

/** Cambia el tamaño de una estancia rectangular: `ancho` en x y `largo` en y. Conserva planta[0] y la orientación de cada pared. */
export function redimensionarRectangulo(doc: DocumentoDiseno, ancho: number, largo: number): ResultadoEdicion {
  const p = doc.estancia.planta
  if (!esRectangular(p)) return falla(textos.edicion.noRectangular)
  const planta = [p[0]]
  for (let i = 0; i < 3; i++) {
    const u = normalizar(restar(p[i + 1], p[i]))
    planta.push(sumar(planta[i], escalar(u, orientacion(p, i) === 'h' ? ancho : largo)))
  }
  return aplicar(doc, planta)
}

/** Mueve el final de la pared; si la siguiente es perpendicular, la traslada entera para que conserve ángulo y longitud. */
export function cambiarLongitudPared(doc: DocumentoDiseno, pared: number, nuevaLongitud: number): ResultadoEdicion {
  const p = doc.estancia.planta
  if (!indiceValido(p, pared) || !Number.isFinite(nuevaLongitud)) return falla(textos.edicion.cambioNoValido)
  const n = p.length
  const ib = (pared + 1) % n
  const ic = (pared + 2) % n
  const d = normalizar(restar(p[ib], p[pared]))
  const desplazamiento = escalar(d, nuevaLongitud - longitudPared(p, pared))
  const siguientePerpendicular = Math.abs(punto(d, normalizar(restar(p[ic], p[ib])))) < EPS
  const planta = p.map((v, i) => (i === ib || (siguientePerpendicular && i === ic) ? sumar(v, desplazamiento) : v))
  return aplicar(doc, planta)
}

export function moverVertice(doc: DocumentoDiseno, indice: number, destino: Punto): ResultadoEdicion {
  const p = doc.estancia.planta
  if (!indiceValido(p, indice)) return falla(textos.edicion.cambioNoValido)
  const nuevo = { x: Math.round(destino.x), y: Math.round(destino.y) }
  return aplicar(doc, p.map((v, i) => (i === indice ? nuevo : v)))
}

/** Pega la x o la y de `p` a la de un vértice vecino si está a ≤ `umbral`, para que las paredes queden rectas. */
export function alinearVertice(planta: Punto[], indice: number, p: Punto, umbral = 5): Punto {
  const n = planta.length
  const vecinos = [planta[(indice - 1 + n) % n], planta[(indice + 1) % n]]
  const pegar = (valor: number, eje: 'x' | 'y') => {
    let mejor = valor
    let distancia = umbral
    for (const v of vecinos) {
      const dv = Math.abs(v[eje] - valor)
      if (dv <= distancia) { mejor = v[eje]; distancia = dv }
    }
    return mejor
  }
  return { x: pegar(p.x, 'x'), y: pegar(p.y, 'y') }
}

/** Inserta el punto medio de la pared, redondeado a cm, como vértice nuevo. */
export function partirPared(doc: DocumentoDiseno, pared: number): ResultadoEdicion {
  const p = doc.estancia.planta
  if (!indiceValido(p, pared)) return falla(textos.edicion.cambioNoValido)
  const a = p[pared]
  const b = p[(pared + 1) % p.length]
  const medio = { x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) }
  const l1 = longitud(restar(medio, a))
  const planta = [...p.slice(0, pared + 1), medio, ...p.slice(pared + 1)]
  return aplicar(doc, planta, h => {
    if (h.pared > pared) return { pared: h.pared + 1, posicion: h.posicion }
    if (h.pared < pared || h.posicion + h.ancho <= l1 + EPS) return { pared: h.pared, posicion: h.posicion }
    if (h.posicion >= l1 - EPS) return { pared: pared + 1, posicion: Math.round(h.posicion - l1) }
    return textos.edicion.huecoEnMedio
  })
}

/** Quita el vértice y une sus dos paredes; el resto de huecos sigue en la misma pared física. */
export function quitarVertice(doc: DocumentoDiseno, indice: number): ResultadoEdicion {
  const p = doc.estancia.planta
  if (!indiceValido(p, indice)) return falla(textos.edicion.cambioNoValido)
  if (p.length - 1 < 3) return falla(textos.edicion.minimoVertices)
  const anterior = (indice - 1 + p.length) % p.length
  if (huecos(doc).some(h => h.pared === indice || h.pared === anterior)) return falla(textos.edicion.paredOcupada)
  const planta = p.filter((_, i) => i !== indice)
  return aplicar(doc, planta, h => ({ pared: h.pared < indice ? h.pared : h.pared - 1, posicion: h.posicion }))
}
