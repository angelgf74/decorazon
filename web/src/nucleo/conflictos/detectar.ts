import type { DocumentoDiseno, Elemento } from '../modelo/documento'
import type { Catalogo, DefinicionTipo, ZonaApertura } from '../catalogo/tipos'
import { distanciaConvexos, interseccionConvexos, penetracion } from '../geometria/convexo'
import { areaConSigno, cajaPlanta, distanciaSegmentos } from '../geometria/poligono'
import { penetracion3D, solapeZ, type Prisma } from '../geometria/prisma'
import type { Punto } from '../geometria/vector'
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

interface Par { p: number; a: Prisma; b: Prisma }

/** Mayor hueco entre las cajas envolventes de dos huellas en x o en y (≤ 0 si se cruzan); nunca supera la distancia real. */
function separacionCajas(a: Punto[], b: Punto[]): number {
  const ca = cajaPlanta(a), cb = cajaPlanta(b)
  return Math.max(cb.minX - ca.maxX, ca.minX - cb.maxX, cb.minY - ca.maxY, ca.minY - cb.maxY)
}

/** Mayor penetración 3D entre dos conjuntos de volúmenes, con el par que la da (undefined si alguno está vacío o ningún par se acerca). */
function maxPenetracion(a: Prisma[], b: Prisma[]): Par | undefined {
  let mejor: Par | undefined
  for (const x of a) {
    for (const y of b) {
      // Cajas separadas o rangos z sin cruzarse: no penetran, y no hace falta el cálculo exacto.
      if (separacionCajas(x.huella, y.huella) >= 0 || solapeZ(x, y) <= 0) continue
      const p = penetracion3D(x, y)
      if (!mejor || p > mejor.p) mejor = { p, a: x, b: y }
    }
  }
  return mejor
}

/** Como `maxPenetracion` para una zona de apertura; si es espacio libre del suelo, lo que falta se mide solo en planta entre los volúmenes que cruza en altura. */
function penetracionZona(zona: ZonaApertura, volumenes: Prisma[]): Par | undefined {
  if (!zona.espacioLibre) return maxPenetracion([zona], volumenes)
  let mejor: Par | undefined
  for (const v of volumenes) {
    if (separacionCajas(zona.huella, v.huella) >= 0 || solapeZ(zona, v) <= TOLERANCIA_CM) continue
    const p = penetracion(zona.huella, v.huella)
    if (!mejor || p > mejor.p) mejor = { p, a: zona, b: v }
  }
  return mejor
}

/** Zona en planta de un choque: intersección de las huellas del par; si saliera vacía por ruido numérico, la huella del primero. */
function zonaDe(par: Par): Punto[] {
  const z = interseccionConvexos(par.a.huella, par.b.huella)
  return z.length > 0 ? z : par.a.huella
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
    let saleVol: Prisma | undefined
    for (const v of a.volumenes) {
      const s = penetracionEnParedes(planta, v.huella)
      if (s > sale) { sale = s; saleVol = v }
    }
    if (sale > TOLERANCIA_CM && saleVol) {
      const n = cantidadMostrada(sale)
      // La planta puede ser cóncava y la huella siempre es convexa: la huella hace de ventana. Con menos de 1 cm² dentro, se pinta entera.
      const dentro = interseccionConvexos(planta, saleVol.huella)
      const huecoDeZona = dentro.length > 0 && areaConSigno(dentro) >= 1 ? dentro : undefined
      conflictos.push({ tipo: 'fueraDeEstancia', gravedad: 'error', ids: [a.e.id], cantidadCm: n, mensaje: mensajeFueraDeEstancia(a.ref, n), zona: saleVol.huella, ...(huecoDeZona && { huecoDeZona }) })
    }

    // Techo.
    let sobra = 0
    let sobraVol: Prisma | undefined
    for (const v of a.volumenes) {
      if (v.zMax - alto > sobra) { sobra = v.zMax - alto; sobraVol = v }
    }
    if (sobra > TOLERANCIA_CM && sobraVol) {
      const n = cantidadMostrada(sobra)
      conflictos.push({ tipo: 'techo', gravedad: 'error', ids: [a.e.id], cantidadCm: n, mensaje: mensajeTecho(a.ref, n), zona: sobraVol.huella })
    }

    // Vigas.
    for (const viga of vigas) {
      let z = -Infinity
      let choca = false
      for (const v of a.volumenes) {
        if (penetracion3D(v, viga.prisma) > TOLERANCIA_CM) { choca = true; z = Math.max(z, solapeZ(v, viga.prisma)) }
      }
      const par = maxPenetracion(a.volumenes, [viga.prisma])
      if (choca && par) {
        const n = cantidadMostrada(z)
        conflictos.push({ tipo: 'viga', gravedad: 'error', ids: [a.e.id, viga.id], cantidadCm: n, mensaje: mensajeViga(a.ref, n), zona: zonaDe(par) })
      }
    }

    // Solape con columnas y radiadores.
    for (const o of fisicosNoViga) {
      const par = maxPenetracion(a.volumenes, [o.prisma])
      if (par && par.p > TOLERANCIA_CM) {
        const n = cantidadMostrada(par.p)
        conflictos.push({ tipo: 'solape', gravedad: 'error', ids: [a.e.id, o.id], cantidadCm: n, mensaje: mensajeSolape(a.ref, refDe(o), n), zona: zonaDe(par) })
      }
    }

    // Zonas protegidas de ventanas y radiadores.
    for (const o of obstaculos.protegidos) {
      const esVentana = o.nombre === 'ventana'
      if (esVentana && a.def.sobreVentana) continue
      const par = maxPenetracion(a.volumenes, [o.prisma])
      if (par && par.p > TOLERANCIA_CM) {
        conflictos.push({
          tipo: esVentana ? 'tapaVentana' : 'tapaRadiador', gravedad: 'error', ids: [a.e.id, o.id], cantidadCm: cantidadMostrada(par.p),
          mensaje: esVentana ? mensajeTapaVentana(a.ref) : mensajeTapaRadiador(a.ref), zona: zonaDe(par),
        })
      }
    }

    // Aperturas del mueble: una vez por nombre de zona y por lo que choca (mueble, obstáculo o pared), con la mayor penetración.
    const choques = new Map<string, { p: number; ids: string[]; zona: string; aviso: boolean; contra: Ref; huella: Punto[] }>()
    const anotar = (p: number, otro: string | null, zona: ZonaApertura, contra: Ref, huella: () => Punto[]) => {
      if (p <= TOLERANCIA_CM) return
      const clave = `${otro ?? ''}|${zona.nombre}`
      const previo = choques.get(clave)
      if (!previo || p > previo.p) {
        choques.set(clave, { p, ids: otro === null ? [a.e.id] : [a.e.id, otro], zona: zona.nombre, aviso: zona.espacioLibre === true, contra, huella: huella() })
      }
    }
    for (const zona of a.zonas) {
      for (const b of piezas) {
        if (b === a || b.def.pisable) continue
        const par = penetracionZona(zona, b.volumenes)
        if (par) anotar(par.p, b.e.id, zona, b.ref, () => zonaDe(par))
      }
      for (const o of obstaculos.fisicos) {
        const par = penetracionZona(zona, [o.prisma])
        if (par) anotar(par.p, o.id, zona, refDe(o), () => zonaDe(par))
      }
      anotar(penetracionEnParedes(planta, zona.huella), null, zona, PARED, () => zona.huella)
    }
    for (const { p, ids, zona, aviso, contra, huella } of choques.values()) {
      const n = cantidadMostrada(p)
      conflictos.push({ tipo: 'apertura', gravedad: aviso ? 'aviso' : 'error', ids, cantidadCm: n, mensaje: mensajeAperturaMueble(zona, a.ref, contra, n), zona: huella })
    }
  }

  // Solape entre elementos (una vez por par).
  for (let i = 0; i < piezas.length; i++) {
    for (let j = i + 1; j < piezas.length; j++) {
      const a = piezas[i], b = piezas[j]
      if (a.def.pisable || b.def.pisable) continue
      const par = maxPenetracion(a.volumenes, b.volumenes)
      if (par && par.p > TOLERANCIA_CM) {
        const n = cantidadMostrada(par.p)
        conflictos.push({ tipo: 'solape', gravedad: 'error', ids: [a.e.id, b.e.id], cantidadCm: n, mensaje: mensajeSolape(a.ref, b.ref, n), zona: zonaDe(par) })
      }
    }
  }

  // Aperturas de la estancia (puertas y ventanas): una vez por zona de apertura y elemento, con la mayor penetración.
  const estancia = new Map<string, { id: string; zona: ZonaApertura; b: Pieza; par: Par }>()
  for (const ap of obstaculos.aperturas) {
    for (const b of piezas) {
      if (b.def.pisable) continue
      const par = maxPenetracion([ap], b.volumenes)
      if (!par || par.p <= TOLERANCIA_CM) continue
      const clave = `${ap.id}|${b.e.id}`
      const previo = estancia.get(clave)
      if (!previo || par.p > previo.par.p) estancia.set(clave, { id: ap.id, zona: ap, b, par })
    }
  }
  for (const { id, zona, b, par } of estancia.values()) {
    const n = cantidadMostrada(par.p)
    conflictos.push({ tipo: 'apertura', gravedad: 'error', ids: [id, b.e.id], cantidadCm: n, mensaje: mensajeAperturaEstancia(zona.nombre, b.ref, n), zona: zonaDe(par) })
  }

  // Pasos estrechos (aviso).
  // Lo que está bajo el tablero de algo que se apoya en el suelo (una cajonera bajo un escritorio) no marca ningún paso:
  // por ahí no se camina, y el paso lo marca el propio tablero.
  const techo = (p: Pieza) => Math.max(...p.volumenes.map((v) => v.zMax))
  const bajoTablero = (p: Pieza) => piezas.some((q) => q !== p
    && q.volumenes.some((w) => w.zMin <= TOLERANCIA_CM)
    && q.volumenes.some((w) => w.zMin >= techo(p) - TOLERANCIA_CM && p.volumenes.some((v) => penetracion(v.huella, w.huella) > TOLERANCIA_CM)))
  const bloquean = piezas.filter((p) => p.def.bloqueaPaso && !bajoTablero(p))
  const estrecho = (d: number) => d >= HUECO_IGNORADO_CM - 1e-6 && d < PASO_MINIMO_CM
  for (let i = 0; i < bloquean.length; i++) {
    const a = bloquean[i]
    for (let j = i + 1; j < bloquean.length; j++) {
      const b = bloquean[j]
      if (a.def.conjunto !== undefined && a.def.conjunto === b.def.conjunto) continue
      let d = Infinity
      for (const v of a.volumenes) {
        for (const w of b.volumenes) {
          // La separación entre cajas envolventes acota la distancia por abajo: si ya es un paso cómodo, se omite.
          if (separacionCajas(v.huella, w.huella) >= PASO_MINIMO_CM) continue
          d = Math.min(d, distanciaConvexos(v.huella, w.huella))
        }
      }
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
    // Cada tramo de pared por separado; el id 'pared:<índice>' los distingue.
    for (let tramo = 0; tramo < planta.length; tramo++) {
      const s1 = planta[tramo], s2 = planta[(tramo + 1) % planta.length]
      let dp = Infinity
      for (const v of a.volumenes) {
        for (let k = 0; k < v.huella.length; k++) dp = Math.min(dp, distanciaSegmentos(s1, s2, v.huella[k], v.huella[(k + 1) % v.huella.length]))
      }
      if (estrecho(dp)) {
        const p = redondearAbajo(dp)
        conflictos.push({ tipo: 'pasoEstrecho', gravedad: 'aviso', ids: [a.e.id, `pared:${tramo}`], cantidadCm: p, mensaje: mensajePasoEstrecho(a.ref, PARED, p) })
      }
    }
  }

  return conflictos
}
