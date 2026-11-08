import { valorVariante, type DefinicionTipo } from '../tipos'
import type { Elemento, Punto } from '../../modelo/documento'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { aMundo, cajaMundo } from '../transformar'
import { caja, cojinesEnTramo, RADIO_BRAZO, RADIO_COJIN, RADIO_ESTRUCTURA } from '../modelos'

/** Fondo de asiento de cada lado de la L, grueso del respaldo (armazón + cojín) y de los brazos, y alto de las patas, en cm. */
const ASIENTO = 90
const RESPALDO = 20
const ARMAZON = 8
const BRAZO = 15
const PATA = 8

type Rect = [number, number, number, number]

/** Con el rincón a la derecha, todo se refleja en x. */
const lado = (e: Elemento) => (valorVariante(sofaRinconera, e, 'rincon') === 'derecha' ? -1 : 1)

function reflejar(e: Elemento, [x0, y0, x1, y1]: Rect): Rect {
  return lado(e) === 1 ? [x0, y0, x1, y1] : [-x1, y0, -x0, y1]
}

/** Los dos lados de la L, con el rincón a la izquierda: el largo contra la pared del fondo y el ala por delante. */
function lados(e: Elemento): Rect[] {
  const { ancho, fondo } = e.medidas
  const yFin = -fondo / 2 + ASIENTO
  return [[-ancho / 2, -fondo / 2, ancho / 2, yFin], [-ancho / 2, yFin, -ancho / 2 + ASIENTO, fondo / 2]].map((r) => reflejar(e, r as Rect))
}

function contornoL(e: Elemento): Punto[] {
  const { ancho, fondo } = e.medidas
  const yFin = -fondo / 2 + ASIENTO
  const xAla = -ancho / 2 + ASIENTO
  const izquierda = [
    { x: -ancho / 2, y: -fondo / 2 }, { x: ancho / 2, y: -fondo / 2 }, { x: ancho / 2, y: yFin },
    { x: xAla, y: yFin }, { x: xAla, y: fondo / 2 }, { x: -ancho / 2, y: fondo / 2 },
  ]
  return lado(e) === 1 ? izquierda : izquierda.map((p) => ({ x: -p.x, y: p.y })).reverse()
}

export const sofaRinconera: DefinicionTipo = {
  id: 'sofa-rinconera', nombre: 'sofá rinconera', genero: 'm', categoria: 'mueble', estancias: ['salon'],
  // Ancho: el lado largo; fondo: lo que mide el ala desde la pared del fondo.
  medidas: { ancho: { min: 200, max: 340, defecto: 260 }, fondo: { min: 150, max: 260, defecto: 200 }, alto: { min: 75, max: 100, defecto: 85 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'rincon', etiqueta: 'Rincón', valores: ['izquierda', 'derecha'], defecto: 'izquierda' }],
  zonasColor: [
    { clave: 'tapizado', etiqueta: 'Tapizado', material: 'tela', defecto: '#7d8a7a' },
    { clave: 'patas', etiqueta: 'Patas', material: 'madera', materiales: ['madera', 'metal', 'lacado'], defecto: '#5b4636' },
  ],
  pisable: false, bloqueaPaso: true, conjunto: 'estar', sobreVentana: false,
  volumenes: (e) => lados(e).map(([x0, y0, x1, y1]) => cajaMundo(e, x0, y0, x1, y1, 0, e.medidas.alto)),
  planta: (e) => [contornoL(e).map((p) => aMundo(e, p))],
  // En el centro del lado largo: `e.posicion` cae en el hueco de la L.
  posicionNombre: (e) => aMundo(e, { x: 0, y: -e.medidas.fondo / 2 + ASIENTO / 2 }),
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const asiento = alto - 40
    const zBase = asiento - 12
    const yFin = -fondo / 2 + ASIENTO
    const xAla = -ancho / 2 + ASIENTO
    const x0 = -ancho / 2, x1 = ancho / 2, y0 = -fondo / 2, y1 = fondo / 2
    // Con el rincón a la izquierda; después se refleja si va a la derecha. [rectángulo, z0, z1, zona, radio]
    type Fila = [Rect, number, number, string, number?]
    const piezas: Fila[] = [
      // Lado largo: base, armazón del respaldo y brazo del extremo libre.
      [[x0, y0, x1, yFin], PATA, zBase, 'tapizado', RADIO_ESTRUCTURA],
      [[x0, y0, x1, y0 + ARMAZON], zBase, alto, 'tapizado', RADIO_ESTRUCTURA],
      [[x1 - BRAZO, y0, x1, yFin], PATA, alto - 20, 'tapizado', RADIO_BRAZO],
      // Cojines del lado largo: el respaldo empieza tras el armazón del ala y el asiento tras los cojines de respaldo del ala.
      ...cojinesEnTramo(x0 + ARMAZON, x1 - BRAZO).map(([a, b]): Fila => [[a, y0 + ARMAZON, b, y0 + RESPALDO], zBase, alto - 4, 'tapizado', RADIO_COJIN]),
      ...cojinesEnTramo(x0 + RESPALDO, x1 - BRAZO).map(([a, b]): Fila => [[a, y0 + RESPALDO, b, yFin], zBase, asiento, 'tapizado', RADIO_COJIN]),
      // Ala: base, armazón contra la pared lateral y brazo del extremo.
      [[x0, yFin, xAla, y1], PATA, zBase, 'tapizado', RADIO_ESTRUCTURA],
      [[x0, yFin, x0 + ARMAZON, y1], zBase, alto, 'tapizado', RADIO_ESTRUCTURA],
      [[x0, y1 - BRAZO, xAla, y1], PATA, alto - 20, 'tapizado', RADIO_BRAZO],
      // Cojines del ala: el respaldo arranca tras los del lado largo (así viste el rincón) y el asiento desde yFin.
      ...cojinesEnTramo(y0 + RESPALDO, y1 - BRAZO).map(([a, b]): Fila => [[x0 + ARMAZON, a, x0 + RESPALDO, b], zBase, alto - 4, 'tapizado', RADIO_COJIN]),
      ...cojinesEnTramo(yFin, y1 - BRAZO).map(([a, b]): Fila => [[x0 + RESPALDO, a, xAla, b], zBase, asiento, 'tapizado', RADIO_COJIN]),
      // Patas en las esquinas de fuera de la L.
      ...([[x0 + 3, y0 + 3], [x1 - 8, y0 + 3], [x1 - 8, yFin - 8], [x0 + 3, y1 - 8], [xAla - 8, y1 - 8]] as [number, number][])
        .map(([x, y]): Fila => [[x, y, x + 5, y + 5], 0, PATA, 'patas']),
    ]
    return piezas.map(([r, z0, z1, zona, radio]): PiezaLocal => {
      const [a, b, c, d] = reflejar(e, r)
      return caja(a, b, z0, c, d, z1, zona, radio)
    })
  },
  zonasApertura: () => [],
}
