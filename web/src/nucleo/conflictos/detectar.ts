import type { DocumentoDiseno, Elemento } from '../modelo/documento'
import type { Catalogo, DefinicionTipo, ZonaApertura } from '../catalogo/tipos'
import { distanciaConvexos } from '../geometria/convexo'
import { distanciaSegmentos } from '../geometria/poligono'
import { penetracion3D, solapeZ, type Prisma } from '../geometria/prisma'
import { cantidadMostrada, redondearAbajo, TOLERANCIA_CM } from '../geometria/tolerancia'
import { HUECO_IGNORADO_CM, PASO_MINIMO_CM } from './constantes'
import { obstaculosDeEstancia, penetracionEnParedes } from './estancia'
import {
  mensajeAperturaEstancia, mensajeAperturaMueble, mensajeFueraDeEstancia, mensajePasoEstrecho, mensajeSolape,
  mensajeTapaRadiador, mensajeTapaVentana, mensajeTecho, mensajeViga, PARED, type Ref,
} from './mensajes'
import type { Conflicto } from './tipos'

export { type Conflicto, type TipoConflicto } from './tipos'

export { HUECO_IGNORADO_CM, PASO_MINIMO_CM } from './constantes'

interface Pieza { e: Elemento; def: DefinicionTipo; ref: Ref; volumenes: Prisma[]; zonas: ZonaApertura[] }

/** Mayor penetración 3D entre dos conjuntos de volúmenes. */
function maxPenetracion(a: Prisma[], b: Prisma[]): number {
  let max = -Infinity
  for (const p of a) for (const q of b) max = Math.max(max, penetracion3D(p, q))
  return max
}

export function detectarConflictos(doc: DocumentoDiseno, catalogo: Catalogo): Conflicto[] {
  const conflictos: Conflicto[] = []
  const { planta, alto } = doc.estancia
  const obstaculos = obstaculosDeEstancia(doc)

  const piezas: Pieza[] = []
  for (const e of doc.elementos) {
    const def = catalogo.get(e.tipo)
    if (!def) continue
    piezas.push({ e, def, ref: { nombre: def.nombre, genero: def.genero }, volumenes: def.volumenes(e), zonas: def.zonasApertura(e) })
  }

  const fisicosNoViga = obstaculos.fisicos.filter((o) => o.nombre !== 'viga')
  const vigas = obstaculos.fisicos.filter((o) => o.nombre === 'viga')
  const refDe = (o: { nombre: string; genero: 'm' | 'f' }): Ref => ({ nombre: o.nombre, genero: o.genero })

  for (const a of piezas) {
    // Fuera de la estancia.
    let sale = 0
    for (const v of a.volumenes) sale = Math.max(sale, penetracionEnParedes(planta, v.huella))
    if (sale > TOLERANCIA_CM) {
      const n = cantidadMostrada(sale)
      conflictos.push({ tipo: 'fueraDeEstancia', gravedad: 'error', ids: [a.e.id], cantidadCm: n, mensaje: mensajeFueraDeEstancia(a.ref, n) })
    }

    // Techo.
    let sobra = 0
    for (const v of a.volumenes) sobra = Math.max(sobra, v.zMax - alto)
    if (sobra > TOLERANCIA_CM) {
      const n = cantidadMostrada(sobra)
      conflictos.push({ tipo: 'techo', gravedad: 'error', ids: [a.e.id], cantidadCm: n, mensaje: mensajeTecho(a.ref, n) })
    }

    // Vigas.
    for (const viga of vigas) {
      let z = -Infinity
      let choca = false
      for (const v of a.volumenes) {
        if (penetracion3D(v, viga.prisma) > TOLERANCIA_CM) { choca = true; z = Math.max(z, solapeZ(v, viga.prisma)) }
      }
      if (choca) {
        const n = cantidadMostrada(z)
        conflictos.push({ tipo: 'viga', gravedad: 'error', ids: [a.e.id, viga.id], cantidadCm: n, mensaje: mensajeViga(a.ref, n) })
      }
    }

    // Solape con columnas y radiadores.
    for (const o of fisicosNoViga) {
      const p = maxPenetracion(a.volumenes, [o.prisma])
      if (p > TOLERANCIA_CM) {
        const n = cantidadMostrada(p)
        conflictos.push({ tipo: 'solape', gravedad: 'error', ids: [a.e.id, o.id], cantidadCm: n, mensaje: mensajeSolape(a.ref, refDe(o), n) })
      }
    }

    // Zonas protegidas de ventanas y radiadores.
    for (const o of obstaculos.protegidos) {
      const esVentana = o.nombre === 'ventana'
      if (esVentana && a.def.sobreVentana) continue
      const p = maxPenetracion(a.volumenes, [o.prisma])
      if (p > TOLERANCIA_CM) {
        conflictos.push({
          tipo: esVentana ? 'tapaVentana' : 'tapaRadiador', gravedad: 'error', ids: [a.e.id, o.id], cantidadCm: cantidadMostrada(p),
          mensaje: esVentana ? mensajeTapaVentana(a.ref) : mensajeTapaRadiador(a.ref),
        })
      }
    }

    // Aperturas del mueble.
    for (const zona of a.zonas) {
      for (const b of piezas) {
        if (b === a || b.def.pisable) continue
        const p = maxPenetracion([zona], b.volumenes)
        if (p > TOLERANCIA_CM) {
          const n = cantidadMostrada(p)
          conflictos.push({ tipo: 'apertura', gravedad: 'error', ids: [a.e.id, b.e.id], cantidadCm: n, mensaje: mensajeAperturaMueble(zona.nombre, a.ref, b.ref, n) })
        }
      }
      for (const o of obstaculos.fisicos) {
        const p = penetracion3D(zona, o.prisma)
        if (p > TOLERANCIA_CM) {
          const n = cantidadMostrada(p)
          conflictos.push({ tipo: 'apertura', gravedad: 'error', ids: [a.e.id, o.id], cantidadCm: n, mensaje: mensajeAperturaMueble(zona.nombre, a.ref, refDe(o), n) })
        }
      }
      const sale = penetracionEnParedes(planta, zona.huella)
      if (sale > TOLERANCIA_CM) {
        const n = cantidadMostrada(sale)
        conflictos.push({ tipo: 'apertura', gravedad: 'error', ids: [a.e.id], cantidadCm: n, mensaje: mensajeAperturaMueble(zona.nombre, a.ref, PARED, n) })
      }
    }
  }

  // Solape entre elementos (una vez por par).
  for (let i = 0; i < piezas.length; i++) {
    for (let j = i + 1; j < piezas.length; j++) {
      const a = piezas[i], b = piezas[j]
      if (a.def.pisable || b.def.pisable) continue
      const p = maxPenetracion(a.volumenes, b.volumenes)
      if (p > TOLERANCIA_CM) {
        const n = cantidadMostrada(p)
        conflictos.push({ tipo: 'solape', gravedad: 'error', ids: [a.e.id, b.e.id], cantidadCm: n, mensaje: mensajeSolape(a.ref, b.ref, n) })
      }
    }
  }

  // Aperturas de la estancia (puertas y ventanas): una vez por zona de apertura y elemento, con la mayor penetración.
  const estancia = new Map<string, { id: string; zona: ZonaApertura; b: Pieza; p: number }>()
  for (const ap of obstaculos.aperturas) {
    for (const b of piezas) {
      if (b.def.pisable) continue
      const p = maxPenetracion([ap], b.volumenes)
      if (p <= TOLERANCIA_CM) continue
      const clave = `${ap.id}|${b.e.id}`
      const previo = estancia.get(clave)
      if (!previo || p > previo.p) estancia.set(clave, { id: ap.id, zona: ap, b, p })
    }
  }
  for (const { id, zona, b, p } of estancia.values()) {
    const n = cantidadMostrada(p)
    conflictos.push({ tipo: 'apertura', gravedad: 'error', ids: [id, b.e.id], cantidadCm: n, mensaje: mensajeAperturaEstancia(zona.nombre, b.ref, n) })
  }

  // Pasos estrechos (aviso).
  const bloquean = piezas.filter((p) => p.def.bloqueaPaso)
  const estrecho = (d: number) => d >= HUECO_IGNORADO_CM - 1e-6 && d < PASO_MINIMO_CM
  for (let i = 0; i < bloquean.length; i++) {
    const a = bloquean[i]
    for (let j = i + 1; j < bloquean.length; j++) {
      const b = bloquean[j]
      let d = Infinity
      for (const v of a.volumenes) for (const w of b.volumenes) d = Math.min(d, distanciaConvexos(v.huella, w.huella))
      if (estrecho(d)) {
        const p = redondearAbajo(d)
        conflictos.push({ tipo: 'pasoEstrecho', gravedad: 'aviso', ids: [a.e.id, b.e.id], cantidadCm: p, mensaje: mensajePasoEstrecho(a.ref, b.ref, p) })
      }
    }
    for (const o of obstaculos.fisicos) {
      if (o.nombre !== 'columna' && o.nombre !== 'radiador') continue
      let d = Infinity
      for (const v of a.volumenes) d = Math.min(d, distanciaConvexos(v.huella, o.prisma.huella))
      if (estrecho(d)) {
        const p = redondearAbajo(d)
        conflictos.push({ tipo: 'pasoEstrecho', gravedad: 'aviso', ids: [a.e.id, o.id], cantidadCm: p, mensaje: mensajePasoEstrecho(a.ref, refDe(o), p) })
      }
    }
    for (let i = 0; i < planta.length; i++) {
      const s1 = planta[i], s2 = planta[(i + 1) % planta.length]
      let dp = Infinity
      for (const v of a.volumenes) {
        for (let k = 0; k < v.huella.length; k++) dp = Math.min(dp, distanciaSegmentos(s1, s2, v.huella[k], v.huella[(k + 1) % v.huella.length]))
      }
      if (estrecho(dp)) {
        const p = redondearAbajo(dp)
        conflictos.push({ tipo: 'pasoEstrecho', gravedad: 'aviso', ids: [a.e.id], cantidadCm: p, mensaje: mensajePasoEstrecho(a.ref, PARED, p) })
      }
    }
  }

  return conflictos
}
