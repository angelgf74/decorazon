import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera, ESPACIO_DE_ENTRADA_CM, espacioDelante, huellaEntera } from '../aperturas'
import { cajaMundo } from '../transformar'
import { caja, cilindro, mampara, oscurecer } from '../modelos'

/** Grueso del borde, hondo de la cubeta, y alto sobre el borde y ancho de la mampara fija, en cm. */
const BORDE = 7
const HONDO = 42
const MAMPARA = 140
const PANEL = 80
const LOZA = '#f4f4f2'

export const banera: DefinicionTipo = {
  id: 'banera', nombre: 'bañera', genero: 'f', categoria: 'mueble', estancias: ['bano'],
  medidas: { ancho: { min: 140, max: 190, defecto: 170 }, fondo: { min: 70, max: 90, defecto: 75 }, alto: { min: 50, max: 65, defecto: 58 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'mampara', etiqueta: 'Mampara', valores: ['ninguna', 'fija'], defecto: 'ninguna' }],
  zonasColor: [
    { clave: 'banera', etiqueta: 'Bañera', material: 'ceramica', defecto: LOZA },
    { clave: 'grifo', etiqueta: 'Grifo y perfiles', material: 'metal', defecto: '#c0c2c4' },
  ],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes(e) {
    const { ancho, fondo, alto } = e.medidas
    const cuerpo = cajaEntera(e)
    if (valorVariante(banera, e, 'mampara') !== 'fija') return cuerpo
    return [...cuerpo, cajaMundo(e, -ancho / 2, fondo / 2 - 1, -ancho / 2 + PANEL, fondo / 2, alto, alto + MAMPARA)]
  },
  planta: huellaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const fija = valorVariante(banera, e, 'mampara') === 'fija'
    return [
      caja(-ancho / 2, -fondo / 2, 0, ancho / 2, -fondo / 2 + BORDE, alto, 'banera'),
      caja(-ancho / 2, fondo / 2 - BORDE, 0, ancho / 2, fondo / 2, alto, 'banera'),
      caja(-ancho / 2, -fondo / 2 + BORDE, 0, -ancho / 2 + BORDE, fondo / 2 - BORDE, alto, 'banera'),
      caja(ancho / 2 - BORDE, -fondo / 2 + BORDE, 0, ancho / 2, fondo / 2 - BORDE, alto, 'banera'),
      // Fondo de la cubeta, más oscuro, para que se lea el hueco.
      { ...caja(-ancho / 2 + BORDE, -fondo / 2 + BORDE, 0, ancho / 2 - BORDE, fondo / 2 - BORDE, alto - HONDO, 'banera'), color: oscurecer(e.colores.banera ?? LOZA, 0.88) },
      cilindro(-ancho / 2 + BORDE + 4, 0, 1.5, alto - 15, alto, 'grifo'),
      ...(fija ? mampara(e, -ancho / 2, -ancho / 2 + PANEL, alto, alto + MAMPARA, 'grifo') : []),
    ]
  },
  zonasApertura: (e) => espacioDelante(e, 'el espacio de entrada', ESPACIO_DE_ENTRADA_CM),
}
