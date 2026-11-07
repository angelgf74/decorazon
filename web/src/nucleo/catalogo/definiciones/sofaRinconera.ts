import { valorVariante, type DefinicionTipo } from '../tipos'
import type { Elemento, Punto } from '../../modelo/documento'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { aMundo, cajaMundo } from '../transformar'
import { caja } from '../modelos'

/** Fondo de asiento de cada lado de la L, grueso del respaldo y de los brazos, y alto de las patas, en cm. */
const ASIENTO = 90
const RESPALDO = 20
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
    { clave: 'patas', etiqueta: 'Patas', material: 'madera', defecto: '#5b4636' },
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
    // Con el rincón a la izquierda; después se refleja si va a la derecha.
    const piezas: [Rect, number, number, string][] = [
      // Lado largo: base, respaldo, cojín y brazo del extremo libre.
      [[-ancho / 2, -fondo / 2, ancho / 2, yFin], PATA, zBase, 'tapizado'],
      [[-ancho / 2, -fondo / 2, ancho / 2, -fondo / 2 + RESPALDO], zBase, alto, 'tapizado'],
      [[-ancho / 2 + RESPALDO, -fondo / 2 + RESPALDO, ancho / 2 - BRAZO, yFin], zBase, asiento, 'tapizado'],
      [[ancho / 2 - BRAZO, -fondo / 2, ancho / 2, yFin], PATA, alto - 20, 'tapizado'],
      // Ala: base, respaldo contra la pared lateral, cojín y brazo del extremo.
      [[-ancho / 2, yFin, xAla, fondo / 2], PATA, zBase, 'tapizado'],
      [[-ancho / 2, yFin, -ancho / 2 + RESPALDO, fondo / 2], zBase, alto, 'tapizado'],
      [[-ancho / 2 + RESPALDO, yFin, xAla, fondo / 2 - BRAZO], zBase, asiento, 'tapizado'],
      [[-ancho / 2, fondo / 2 - BRAZO, xAla, fondo / 2], PATA, alto - 20, 'tapizado'],
      // Patas en las esquinas de fuera de la L.
      ...([[-ancho / 2 + 3, -fondo / 2 + 3], [ancho / 2 - 8, -fondo / 2 + 3], [ancho / 2 - 8, yFin - 8], [-ancho / 2 + 3, fondo / 2 - 8], [xAla - 8, fondo / 2 - 8]] as [number, number][])
        .map(([x, y]): [Rect, number, number, string] => [[x, y, x + 5, y + 5], 0, PATA, 'patas']),
    ]
    return piezas.map(([r, z0, z1, zona]): PiezaLocal => {
      const [x0, y0, x1, y1] = reflejar(e, r)
      return caja(x0, y0, z0, x1, y1, z1, zona)
    })
  },
  zonasApertura: () => [],
}
