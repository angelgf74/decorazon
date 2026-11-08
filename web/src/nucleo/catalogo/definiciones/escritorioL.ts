import { valorVariante, type DefinicionTipo } from '../tipos'
import type { Elemento, Punto } from '../../modelo/documento'
import { aMundo, cajaMundo } from '../transformar'
import { caja } from '../modelos'

/** Fondo de cada tablero de la L y lado de las patas, en cm. */
const FONDO_TABLERO = 60
const PATA = 5
/** Las patas van metidas 3 cm desde el borde del tablero. */
const MARGEN = 3

type Rect = [number, number, number, number]

/** Tablero principal a lo ancho, contra la pared del fondo (y local negativa), y ala delante en el lado elegido: [x0, y0, x1, y1]. */
function tableros(e: Elemento): Rect[] {
  const { ancho, fondo } = e.medidas
  const derecha = valorVariante(escritorioL, e, 'ala') === 'derecha'
  const yFin = -fondo / 2 + FONDO_TABLERO
  const [ax0, ax1] = derecha ? [ancho / 2 - FONDO_TABLERO, ancho / 2] : [-ancho / 2, -ancho / 2 + FONDO_TABLERO]
  return [[-ancho / 2, -fondo / 2, ancho / 2, yFin], [ax0, yFin, ax1, fondo / 2]]
}

/** La L entera en coordenadas locales, en el mismo sentido que `cajaMundo`: un solo polígono, sin línea entre los tableros. */
function contornoL(e: Elemento): Punto[] {
  const { ancho, fondo } = e.medidas
  const yFin = -fondo / 2 + FONDO_TABLERO
  const atras = [{ x: -ancho / 2, y: -fondo / 2 }, { x: ancho / 2, y: -fondo / 2 }]
  if (valorVariante(escritorioL, e, 'ala') === 'derecha') {
    const xAla = ancho / 2 - FONDO_TABLERO
    return [...atras, { x: ancho / 2, y: fondo / 2 }, { x: xAla, y: fondo / 2 }, { x: xAla, y: yFin }, { x: -ancho / 2, y: yFin }]
  }
  const xAla = -ancho / 2 + FONDO_TABLERO
  return [...atras, { x: ancho / 2, y: yFin }, { x: xAla, y: yFin }, { x: xAla, y: fondo / 2 }, { x: -ancho / 2, y: fondo / 2 }]
}

/** Esquina [x0, y0] de cada una de las cinco patas: en las esquinas de la L salvo la de dentro. */
function patas(e: Elemento): [number, number][] {
  const { ancho, fondo } = e.medidas
  const derecha = valorVariante(escritorioL, e, 'ala') === 'derecha'
  const izq = -ancho / 2 + MARGEN, der = ancho / 2 - MARGEN - PATA
  const atras = -fondo / 2 + MARGEN, delante = fondo / 2 - MARGEN - PATA
  const finPrincipal = -fondo / 2 + FONDO_TABLERO - MARGEN - PATA
  const exterior = derecha ? der : izq
  const interior = derecha ? ancho / 2 - FONDO_TABLERO + MARGEN : -ancho / 2 + FONDO_TABLERO - MARGEN - PATA
  const libre = derecha ? izq : der
  return [[izq, atras], [der, atras], [libre, finPrincipal], [exterior, delante], [interior, delante]]
}

export const escritorioL: DefinicionTipo = {
  id: 'escritorio-l', nombre: 'escritorio en L', genero: 'm', categoria: 'mueble', estancias: ['despacho'],
  medidas: { ancho: { min: 120, max: 220, defecto: 160 }, fondo: { min: 100, max: 200, defecto: 140 }, alto: { min: 70, max: 80, defecto: 75 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'ala', etiqueta: 'Ala', valores: ['derecha', 'izquierda'], defecto: 'derecha' }],
  zonasColor: [{ clave: 'tablero', etiqueta: 'Tablero', material: 'madera', materiales: ['madera', 'lacado'], defecto: '#c9a77c' }, { clave: 'patas', etiqueta: 'Patas', material: 'metal', materiales: ['metal', 'madera', 'lacado'], defecto: '#3a3a3a' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes(e) {
    const alto = e.medidas.alto
    return [
      ...tableros(e).map(([x0, y0, x1, y1]) => cajaMundo(e, x0, y0, x1, y1, alto - 3, alto)),
      ...patas(e).map(([x, y]) => cajaMundo(e, x, y, x + PATA, y + PATA, 0, alto - 3)),
    ]
  },
  planta: (e) => [contornoL(e).map((p) => aMundo(e, p))],
  // En el centro del tablero principal: `e.posicion` cae en la esquina vacía de la L.
  posicionNombre: (e) => aMundo(e, { x: 0, y: -e.medidas.fondo / 2 + FONDO_TABLERO / 2 }),
  modelo3d(e) {
    const alto = e.medidas.alto
    return [
      ...tableros(e).map(([x0, y0, x1, y1]) => caja(x0, y0, alto - 3, x1, y1, alto, 'tablero')),
      ...patas(e).map(([x, y]) => caja(x, y, 0, x + PATA, y + PATA, alto - 3, 'patas')),
    ]
  },
  zonasApertura: () => [],
}
