import { valorMedidaExtra, valorVariante, type DefinicionTipo, type ZonaApertura } from '../tipos'
import type { Elemento, Punto } from '../../modelo/documento'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { sectorCircunscrito } from '../../geometria/formas'
import { aMundo, cajaMundo } from '../transformar'
import { caja } from '../modelos'

/** Frente libre mínimo para poner puertas en un lado, y ancho máximo de cada hoja (como las de PAX). */
const PUERTA_MINIMA = 30
const HOJA_MAXIMA = 60
/** Lo que queda como mínimo de frente en cada lado y de unión entre los dos cuerpos. */
const MINIMO = 10
/** Los frentes van retranqueados como los del armario, con una junta entre hojas. */
const FRENTE_Y0 = 3.5
const FRENTE_Y1 = 1.5
const JUNTA = 0.4
const TIRADOR = 12

type Rect = [number, number, number, number]

/** Con el rincón a la derecha, todo se refleja en x. */
const derecha = (e: Elemento) => valorVariante(armarioEsquinero, e, 'rincon') === 'derecha'

/** La profundidad de antes (variante 35/58), para los esquineros guardados sin medidas extra. */
function profundidadDeAntes(e: Elemento): number | undefined {
  const p = e.variantes.profundidad
  return p === 35 || p === 58 ? p : undefined
}

/**
 * Los rangos de las medidas extra según las demás: siempre queda frente (MINIMO), los dos cuerpos siguen unidos al
 * menos MINIMO y el hueco no pasa del cuerpo del fondo. Así lo que dice cada campo es lo que se dibuja.
 */
const conMaximo = (min: number, max: number, defecto: number) => ({ min, max: Math.max(min, max), defecto: Math.min(defecto, Math.max(min, max)) })
const rangoFondo = (e: Elemento) => conMaximo(30, Math.min(70, e.medidas.fondo - MINIMO), 58)
const rangoAla = (e: Elemento) => conMaximo(30, Math.min(70, e.medidas.ancho - MINIMO), 58)
const rangoHuecoAncho = (e: Elemento) => conMaximo(0, Math.min(40, valorMedidaExtra(armarioEsquinero, e, 'anchoAla') - MINIMO), 0)
const rangoHuecoFondo = (e: Elemento) => conMaximo(0, Math.min(70, valorMedidaExtra(armarioEsquinero, e, 'profundidadFondo')), 0)

/**
 * Las medidas con el rincón a la izquierda y el origen en la esquina de las dos paredes (X a lo largo de la pared del
 * fondo, Y a lo largo de la izquierda), ya dentro de sus rangos. Con una de las dos medidas del hueco a 0, no hay hueco.
 */
function marco(e: Elemento) {
  const { ancho: A, fondo: F, alto } = e.medidas
  const pF = valorMedidaExtra(armarioEsquinero, e, 'profundidadFondo')
  const aA = valorMedidaExtra(armarioEsquinero, e, 'anchoAla')
  let hx = valorMedidaExtra(armarioEsquinero, e, 'huecoAncho')
  let hy = valorMedidaExtra(armarioEsquinero, e, 'huecoFondo')
  if (hx === 0 || hy === 0) hx = hy = 0
  return { A, F, alto, pF, aA, hx, hy }
}

/** De coordenadas desde el rincón a locales (centro de la huella), reflejando si el rincón va a la derecha. */
function local(e: Elemento, X: number, Y: number): Punto {
  const x = -e.medidas.ancho / 2 + X
  return { x: derecha(e) ? -x : x, y: -e.medidas.fondo / 2 + Y }
}

/** Un rectángulo desde el rincón, en locales y ordenado (x0 < x1). */
function rect(e: Elemento, X0: number, Y0: number, X1: number, Y1: number): Rect {
  const a = local(e, X0, Y0)
  const b = local(e, X1, Y1)
  return [Math.min(a.x, b.x), Math.min(a.y, b.y), Math.max(a.x, b.x), Math.max(a.y, b.y)]
}

/** Los dos cuerpos: el del fondo, contra la pared de atrás desde el hueco, y el ala, contra la izquierda desde el hueco. */
function cuerpos(e: Elemento): Rect[] {
  const { A, F, pF, aA, hx, hy } = marco(e)
  return [rect(e, hx, 0, A, pF), rect(e, 0, hy, aA, F)]
}

/** El contorno de la unión de los dos cuerpos (hasta 8 vértices), sin vértices repetidos ni alineados. */
function contorno(e: Elemento): Punto[] {
  const { A, F, pF, aA, hx, hy } = marco(e)
  const desdeRincon: [number, number][] = [[hx, 0], [A, 0], [A, pF], [aA, pF], [aA, F], [0, F], [0, hy], [hx, hy]]
  const unicos = desdeRincon.filter(([x, y], i) => {
    const [px, py] = desdeRincon[(i + desdeRincon.length - 1) % desdeRincon.length]!
    return x !== px || y !== py
  })
  const sinAlineados = unicos.filter(([x, y], i) => {
    const [px, py] = unicos[(i + unicos.length - 1) % unicos.length]!
    const [nx, ny] = unicos[(i + 1) % unicos.length]!
    return (x - px) * (ny - y) - (y - py) * (nx - x) !== 0
  })
  const puntos = sinAlineados.map(([x, y]) => local(e, x, y))
  // Reflejado, el sentido de giro se invierte: se da la vuelta para conservarlo.
  return derecha(e) ? puntos.reverse() : puntos
}

/** Cuántas hojas lleva un frente libre: ninguna si es estrecho; si no, las justas para no pasar de HOJA_MAXIMA. */
const hojas = (libre: number) => (libre < PUERTA_MINIMA ? 0 : Math.ceil(libre / HOJA_MAXIMA))

/**
 * Las hojas de un frente, de fuera hacia el rincón. Cada una: dónde va (de `a`, fuera, a `b`, hacia el rincón) a lo
 * largo del frente y si la bisagra está en su extremo de fuera (la primera, la tercera…) o en el del rincón.
 */
function hojasDe(desde: number, hasta: number): { a: number; b: number; bisagraFuera: boolean }[] {
  const n = hojas(Math.abs(hasta - desde))
  const w = (hasta - desde) / n
  return Array.from({ length: n }, (_, k) => ({ a: hasta - k * w, b: hasta - (k + 1) * w, bisagraFuera: k % 2 === 0 }))
}

/** Las puertas abren hacia el hueco de la L: las del fondo hacia +Y, las del ala hacia +X. */
function puertas(e: Elemento): ZonaApertura[] {
  const { A, F, alto, pF, aA } = marco(e)
  const sectores: Punto[][] = []
  for (const { a, b, bisagraFuera } of hojasDe(aA, A)) {
    const w = a - b
    // Bisagra fuera (en a): cerrada mira a −X y abre a +Y. En el rincón (en b): cerrada mira a +X.
    sectores.push(bisagraFuera ? sectorCircunscrito({ x: a, y: pF }, w, 90, 180) : sectorCircunscrito({ x: b, y: pF }, w, 0, 90))
  }
  for (const { a, b, bisagraFuera } of hojasDe(pF, F)) {
    const w = a - b
    // Bisagra fuera (en a): cerrada mira a −Y y abre a +X. En el rincón (en b): cerrada mira a +Y.
    sectores.push(bisagraFuera ? sectorCircunscrito({ x: aA, y: a }, w, 270, 360) : sectorCircunscrito({ x: aA, y: b }, w, 0, 90))
  }
  return sectores.map((s) => {
    const puntos = s.map((p) => local(e, p.x, p.y))
    return {
      nombre: 'la puerta',
      huella: (derecha(e) ? puntos.reverse() : puntos).map((q) => aMundo(e, q)),
      zMin: e.alturaSuelo,
      zMax: e.alturaSuelo + alto,
    }
  })
}

export const armarioEsquinero: DefinicionTipo = {
  id: 'armario-esquinero', nombre: 'armario esquinero', genero: 'm', categoria: 'mueble', estancias: ['dormitorio'],
  // Ancho: el lado contra la pared del fondo; fondo: el lado del ala. Los dos por fuera, como da la tienda («110/110»).
  medidas: { ancho: { min: 80, max: 200, defecto: 110 }, fondo: { min: 80, max: 200, defecto: 110 }, alto: { min: 150, max: 260, defecto: 201 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'rincon', etiqueta: 'Rincón', valores: ['izquierda', 'derecha'], defecto: 'izquierda' }],
  // Sustituyen a la variante «Profundidad» 35/58: un esquinero guardado con ella la toma para el fondo y el ala.
  medidasExtra: [
    { clave: 'profundidadFondo', etiqueta: 'Profundidad del fondo', rango: { min: 30, max: 70, defecto: 58 }, rangoPara: rangoFondo, legado: profundidadDeAntes },
    { clave: 'anchoAla', etiqueta: 'Ancho del ala', rango: { min: 30, max: 70, defecto: 58 }, rangoPara: rangoAla, legado: profundidadDeAntes },
    { clave: 'huecoAncho', etiqueta: 'Hueco: ancho', rango: { min: 0, max: 40, defecto: 0 }, rangoPara: rangoHuecoAncho },
    { clave: 'huecoFondo', etiqueta: 'Hueco: fondo', rango: { min: 0, max: 70, defecto: 0 }, rangoPara: rangoHuecoFondo },
  ],
  detallesExtra(e) {
    const { pF, aA, hx, hy } = marco(e)
    return [`Profundidad del fondo: ${pF} cm`, `Ancho del ala: ${aA} cm`, ...(hx > 0 ? [`Hueco del rincón: ${hx} × ${hy} cm`] : [])]
  },
  zonasColor: [
    { clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'lacado', materiales: ['lacado', 'madera'], defecto: '#e8e4dc' },
    { clave: 'puertas', etiqueta: 'Puertas', material: 'lacado', materiales: ['lacado', 'madera'], defecto: '#f2f0ea' },
  ],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: (e) => cuerpos(e).map(([x0, y0, x1, y1]) => cajaMundo(e, x0, y0, x1, y1, 0, e.medidas.alto)),
  planta: (e) => [contorno(e).map((q) => aMundo(e, q))],
  // Sobre el lado largo (`e.posicion` cae en el hueco de la L): el cuerpo del fondo o, si el ala es más larga, el ala.
  posicionNombre(e) {
    const { A, F, pF, aA, hx } = marco(e)
    return aMundo(e, F > A ? local(e, aA / 2, (pF + F) / 2) : local(e, (hx + A) / 2, pF / 2))
  },
  modelo3d(e) {
    const { A, F, alto, pF, aA, hx, hy } = marco(e)
    const zTirador = alto / 2 - TIRADOR / 2
    // Cajas del cuerpo que no se solapan (con caras en el mismo plano parpadeaban, y la selección cruzaba la tapa):
    // el fondo hasta el retranqueo de su frente; la franja de ese retranqueo detrás del ala, hasta el rincón de dentro;
    // el ala delante de esa franja; y, si hay hueco y el ala llega más atrás, el trozo de ala al lado del hueco.
    const piezas: [Rect, number, number, string][] = [
      [rect(e, hx, 0, A, pF - FRENTE_Y0), 0, alto, 'cuerpo'],
      [rect(e, hx, pF - FRENTE_Y0, aA, pF), 0, alto, 'cuerpo'],
      [rect(e, 0, pF, aA - FRENTE_Y0, F), 0, alto, 'cuerpo'],
    ]
    if (hx > 0 && hy < pF) piezas.push([rect(e, 0, hy, hx, pF), 0, alto, 'cuerpo'])
    // Frente del fondo: hojas a lo largo de X, con el tirador junto al canto contrario a la bisagra.
    const fondoHojas = hojasDe(aA, A)
    if (fondoHojas.length === 0) piezas.push([rect(e, aA, pF - FRENTE_Y0, A, pF - FRENTE_Y1), 1, alto - 1, 'cuerpo'])
    for (const { a, b, bisagraFuera } of fondoHojas) {
      piezas.push([rect(e, b + JUNTA / 2, pF - FRENTE_Y0, a - JUNTA / 2, pF - FRENTE_Y1), 1, alto - 1, 'puertas'])
      const x = bisagraFuera ? b + 2 : a - 3.5
      piezas.push([rect(e, x, pF - FRENTE_Y1, x + 1.5, pF), zTirador, zTirador + TIRADOR, 'puertas'])
    }
    // Frente del ala: hojas a lo largo de Y.
    const alaHojas = hojasDe(pF, F)
    if (alaHojas.length === 0) piezas.push([rect(e, aA - FRENTE_Y0, pF, aA - FRENTE_Y1, F), 1, alto - 1, 'cuerpo'])
    for (const { a, b, bisagraFuera } of alaHojas) {
      piezas.push([rect(e, aA - FRENTE_Y0, b + JUNTA / 2, aA - FRENTE_Y1, a - JUNTA / 2), 1, alto - 1, 'puertas'])
      const y = bisagraFuera ? b + 2 : a - 3.5
      piezas.push([rect(e, aA - FRENTE_Y1, y, aA, y + 1.5), zTirador, zTirador + TIRADOR, 'puertas'])
    }
    return piezas.map(([[x0, y0, x1, y1], z0, z1, zona]): PiezaLocal => caja(x0, y0, z0, x1, y1, z1, zona))
  },
  zonasApertura: puertas,
}
