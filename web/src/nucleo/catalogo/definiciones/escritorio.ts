import { valorVariante, type DefinicionTipo } from '../tipos'
import type { Elemento } from '../../modelo/documento'
import { cajonesEn, huellaEntera, tableroConApoyos } from '../aperturas'
import { caja, cajoneraLateral, cilindro, formaPatas, mesaConPatas, VARIANTE_PATAS } from '../modelos'

/** Ancho de una cajonera bajo el tablero (lo habitual en catálogos de oficina) y el hueco mínimo entre dos para las piernas. */
const CAJONERA = 40
const HUECO_PIERNAS = 20

type Cajonera = 'no' | 'izquierda' | 'derecha' | 'ambas'
const cajoneraDe = (e: Elemento): Cajonera => valorVariante(escritorio, e, 'cajonera') as Cajonera
/** Lados con cajonera: −1 el izquierdo, +1 el derecho. */
const ladosConCajonera = (e: Elemento): number[] => {
  const c = cajoneraDe(e)
  return c === 'ambas' ? [-1, 1] : c === 'izquierda' ? [-1] : c === 'derecha' ? [1] : []
}
const tramo = (e: Elemento, lado: number): [number, number] => {
  const { ancho } = e.medidas
  return lado < 0 ? [-ancho / 2, -ancho / 2 + CAJONERA] : [ancho / 2 - CAJONERA, ancho / 2]
}

export const escritorio: DefinicionTipo = {
  id: 'escritorio', nombre: 'escritorio', genero: 'm', categoria: 'mueble', estancias: ['dormitorio', 'salon', 'despacho'],
  medidas: { ancho: { min: 80, max: 200, defecto: 120 }, fondo: { min: 50, max: 80, defecto: 60 }, alto: { min: 70, max: 80, defecto: 75 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [
    {
      // Con «izquierda» y «derecha» entre los valores, «Voltear» la cambia de lado solo.
      clave: 'cajonera', etiqueta: 'Cajonera', valores: ['no', 'izquierda', 'derecha', 'ambas'], defecto: 'no',
      valoresPara: (e) => (e.medidas.ancho >= 2 * CAJONERA + HUECO_PIERNAS ? ['no', 'izquierda', 'derecha', 'ambas'] : ['no', 'izquierda', 'derecha']),
    },
    // Con las dos cajoneras no hay patas: la forma no dice nada y no se enseña.
    { ...VARIANTE_PATAS, valoresPara: (e) => (cajoneraDe(e) === 'ambas' ? ['cuadradas'] : VARIANTE_PATAS.valores), ocultarConUnValor: true },
  ],
  zonasColor: [
    { clave: 'tablero', etiqueta: 'Tablero', material: 'madera', defecto: '#c9a77c' },
    { clave: 'patas', etiqueta: 'Patas', material: 'metal', materiales: ['metal', 'madera', 'lacado'], defecto: '#3a3a3a' },
  ],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes(e) {
    const lados = ladosConCajonera(e)
    return tableroConApoyos(e, lados.includes(-1) ? 'cajonera' : 'pata', lados.includes(1) ? 'cajonera' : 'pata', CAJONERA)
  },
  planta: huellaEntera,
  // Sin cajonera, la mesa de siempre; con ella, el tablero, la cajonera (cuerpo del color del tablero, tiradores del de las patas) y patas solo en el lado libre.
  modelo3d(e) {
    const lados = ladosConCajonera(e)
    if (lados.length === 0) return mesaConPatas(e, 'tablero', 'patas')
    const { ancho, fondo, alto } = e.medidas
    const pata = (x: number) => [-fondo / 2 + 3, fondo / 2 - 8].map((y) =>
      (formaPatas(e) === 'redondas' ? cilindro(x + 2.5, y + 2.5, 2.5, 0, alto - 3, 'patas') : caja(x, y, 0, x + 5, y + 5, alto - 3, 'patas')))
    return [
      caja(-ancho / 2, -fondo / 2, alto - 3, ancho / 2, fondo / 2, alto, 'tablero', 1),
      ...lados.flatMap((lado) => cajoneraLateral(e, ...tramo(e, lado), alto - 3, 'tablero', 'patas')),
      ...(lados.includes(-1) ? [] : pata(-ancho / 2 + 3)),
      ...(lados.includes(1) ? [] : pata(ancho / 2 - 8)),
    ]
  },
  zonasApertura: (e) => ladosConCajonera(e).flatMap((lado) => cajonesEn(e, ...tramo(e, lado), e.medidas.fondo - 5, 0, e.medidas.alto - 3)),
}
