import { valorVariante, type DefinicionTipo, type ZonaApertura } from '../tipos'
import type { Elemento, Punto } from '../../modelo/documento'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { sectorCircunscrito } from '../../geometria/formas'
import { aMundo, cajaMundo } from '../transformar'
import { caja } from '../modelos'

/** Frente libre mínimo para poner puertas en un lado, y ancho máximo de cada hoja (como las de PAX). */
const PUERTA_MINIMA = 30
const HOJA_MAXIMA = 60
/** Los frentes van retranqueados como los del armario, con una junta entre hojas. */
const FRENTE_Y0 = 3.5
const FRENTE_Y1 = 1.5
const JUNTA = 0.4
const TIRADOR = 12

type Rect = [number, number, number, number]

/** Con el rincón a la derecha, todo se refleja en x. */
const derecha = (e: Elemento) => valorVariante(armarioEsquinero, e, 'rincon') === 'derecha'
const profundidad = (e: Elemento) => Number(valorVariante(armarioEsquinero, e, 'profundidad'))

function reflejar(e: Elemento, [x0, y0, x1, y1]: Rect): Rect {
  return derecha(e) ? [-x1, y0, -x0, y1] : [x0, y0, x1, y1]
}

/** Un polígono local reflejado si hace falta (con el orden al revés, para conservar el sentido de giro). */
function reflejarPoligono(e: Elemento, puntos: Punto[]): Punto[] {
  return derecha(e) ? puntos.map((p) => ({ x: -p.x, y: p.y })).reverse() : puntos
}

/** Medidas locales con el rincón a la izquierda: dónde acaba el cuerpo del fondo (yFrente) y el del ala (xAla). */
function marco(e: Elemento) {
  const { ancho, fondo, alto } = e.medidas
  const p = profundidad(e)
  return { ancho, fondo, alto, p, yFrente: -fondo / 2 + p, xAla: -ancho / 2 + p }
}

/**
 * Los dos cuerpos, con el rincón a la izquierda: el del fondo a todo el ancho contra la pared de atrás y el del ala
 * contra la pared de la izquierda, hasta delante. El hueco de la L es lo que queda delante del cuerpo del fondo.
 */
function cuerpos(e: Elemento): Rect[] {
  const { ancho, fondo, yFrente, xAla } = marco(e)
  return [[-ancho / 2, -fondo / 2, ancho / 2, yFrente], [-ancho / 2, yFrente, xAla, fondo / 2]]
}

/** Cuántas hojas lleva un frente libre: ninguna si es estrecho; si no, las justas para no pasar de HOJA_MAXIMA. */
const hojas = (libre: number) => (libre < PUERTA_MINIMA ? 0 : Math.ceil(libre / HOJA_MAXIMA))

/**
 * Las hojas de cada frente, de fuera hacia el rincón. Cada una: dónde va (de `desde` a `hasta` a lo largo del frente) y
 * si la bisagra está en su extremo de fuera (la primera, la tercera…) o en el del rincón.
 */
function hojasDe(desde: number, hasta: number): { a: number; b: number; bisagraFuera: boolean }[] {
  const n = hojas(Math.abs(hasta - desde))
  const w = (hasta - desde) / n
  return Array.from({ length: n }, (_, k) => ({ a: hasta - k * w, b: hasta - (k + 1) * w, bisagraFuera: k % 2 === 0 }))
}

function contornoL(e: Elemento): Punto[] {
  const { ancho, fondo, yFrente, xAla } = marco(e)
  return reflejarPoligono(e, [
    { x: -ancho / 2, y: -fondo / 2 }, { x: ancho / 2, y: -fondo / 2 }, { x: ancho / 2, y: yFrente },
    { x: xAla, y: yFrente }, { x: xAla, y: fondo / 2 }, { x: -ancho / 2, y: fondo / 2 },
  ])
}

/** Las puertas abren hacia el hueco de la L: las del fondo hacia +y, las del ala hacia +x. */
function puertas(e: Elemento): ZonaApertura[] {
  const { ancho, fondo, alto, yFrente, xAla } = marco(e)
  const sectores: Punto[][] = []
  for (const { a, b, bisagraFuera } of hojasDe(xAla, ancho / 2)) {
    const w = a - b
    // Bisagra fuera (en a): cerrada mira a −x y abre a +y. En el rincón (en b): cerrada mira a +x.
    sectores.push(bisagraFuera ? sectorCircunscrito({ x: a, y: yFrente }, w, 90, 180) : sectorCircunscrito({ x: b, y: yFrente }, w, 0, 90))
  }
  for (const { a, b, bisagraFuera } of hojasDe(yFrente, fondo / 2)) {
    const w = a - b
    // Bisagra fuera (en a): cerrada mira a −y y abre a +x. En el rincón (en b): cerrada mira a +y.
    sectores.push(bisagraFuera ? sectorCircunscrito({ x: xAla, y: a }, w, 270, 360) : sectorCircunscrito({ x: xAla, y: b }, w, 0, 90))
  }
  return sectores.map((s) => ({
    nombre: 'la puerta',
    huella: reflejarPoligono(e, s).map((q) => aMundo(e, q)),
    zMin: e.alturaSuelo,
    zMax: e.alturaSuelo + alto,
  }))
}

export const armarioEsquinero: DefinicionTipo = {
  id: 'armario-esquinero', nombre: 'armario esquinero', genero: 'm', categoria: 'mueble', estancias: ['dormitorio'],
  // Ancho: el lado contra la pared del fondo; fondo: el lado del ala. Los dos por fuera, como da la tienda («110/110»).
  medidas: { ancho: { min: 80, max: 200, defecto: 110 }, fondo: { min: 80, max: 200, defecto: 110 }, alto: { min: 150, max: 260, defecto: 201 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [
    { clave: 'rincon', etiqueta: 'Rincón', valores: ['izquierda', 'derecha'], defecto: 'izquierda' },
    { clave: 'profundidad', etiqueta: 'Profundidad', valores: [35, 58], defecto: 58 },
  ],
  zonasColor: [
    { clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'lacado', defecto: '#e8e4dc' },
    { clave: 'puertas', etiqueta: 'Puertas', material: 'lacado', defecto: '#f2f0ea' },
  ],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: (e) => cuerpos(e).map((r) => {
    const [x0, y0, x1, y1] = reflejar(e, r)
    return cajaMundo(e, x0, y0, x1, y1, 0, e.medidas.alto)
  }),
  planta: (e) => [contornoL(e).map((q) => aMundo(e, q))],
  // Sobre el lado largo (`e.posicion` cae en el hueco de la L): el cuerpo del fondo o, si el ala es más larga, el ala.
  posicionNombre(e) {
    const { ancho, fondo, p, yFrente } = marco(e)
    const local = fondo > ancho ? { x: -ancho / 2 + p / 2, y: (yFrente + fondo / 2) / 2 } : { x: 0, y: -fondo / 2 + p / 2 }
    return aMundo(e, derecha(e) ? { x: -local.x, y: local.y } : local)
  },
  modelo3d(e) {
    const { ancho, fondo, alto, yFrente, xAla } = marco(e)
    const zTirador = alto / 2 - TIRADOR / 2
    // Con el rincón a la izquierda; después se refleja si va a la derecha.
    const piezas: [Rect, number, number, string][] = [
      [[-ancho / 2, -fondo / 2, ancho / 2, yFrente - FRENTE_Y0], 0, alto, 'cuerpo'],
      [[-ancho / 2, yFrente - FRENTE_Y0, xAla - FRENTE_Y0, fondo / 2], 0, alto, 'cuerpo'],
      // El rincón de dentro, donde se juntan los dos frentes: sin esto quedaba un hueco a toda la altura.
      [[xAla - FRENTE_Y0, yFrente - FRENTE_Y0, xAla, yFrente], 0, alto, 'cuerpo'],
    ]
    // Frente del fondo: hojas a lo largo de x, con el tirador junto al canto contrario a la bisagra.
    const fondoHojas = hojasDe(xAla, ancho / 2)
    if (fondoHojas.length === 0) piezas.push([[xAla, yFrente - FRENTE_Y0, ancho / 2, yFrente - FRENTE_Y1], 1, alto - 1, 'cuerpo'])
    for (const { a, b, bisagraFuera } of fondoHojas) {
      piezas.push([[b + JUNTA / 2, yFrente - FRENTE_Y0, a - JUNTA / 2, yFrente - FRENTE_Y1], 1, alto - 1, 'puertas'])
      const x = bisagraFuera ? b + 2 : a - 3.5
      piezas.push([[x, yFrente - FRENTE_Y1, x + 1.5, yFrente], zTirador, zTirador + TIRADOR, 'puertas'])
    }
    // Frente del ala: hojas a lo largo de y.
    const alaHojas = hojasDe(yFrente, fondo / 2)
    if (alaHojas.length === 0) piezas.push([[xAla - FRENTE_Y0, yFrente, xAla - FRENTE_Y1, fondo / 2], 1, alto - 1, 'cuerpo'])
    for (const { a, b, bisagraFuera } of alaHojas) {
      piezas.push([[xAla - FRENTE_Y0, b + JUNTA / 2, xAla - FRENTE_Y1, a - JUNTA / 2], 1, alto - 1, 'puertas'])
      const y = bisagraFuera ? b + 2 : a - 3.5
      piezas.push([[xAla - FRENTE_Y1, y, xAla, y + 1.5], zTirador, zTirador + TIRADOR, 'puertas'])
    }
    return piezas.map(([r, z0, z1, zona]): PiezaLocal => {
      const [x0, y0, x1, y1] = reflejar(e, r)
      return caja(x0, y0, z0, x1, y1, z1, zona)
    })
  },
  zonasApertura: puertas,
}
