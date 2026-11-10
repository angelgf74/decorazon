import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera, ESPACIO_DE_ENTRADA_CM, espacioDelante, huellaEntera } from '../aperturas'
import { cajaMundo } from '../transformar'
import { extrusion, mampara, oscurecer, tubo } from '../modelos'
import { rectanguloRedondeado } from '../perfiles'

/** Grueso del borde, hondo de la cubeta, y alto sobre el borde y ancho de la mampara fija, en cm. */
const BORDE = 7
const HONDO = 42
const MAMPARA = 140
const PANEL = 80
const LOZA = '#f4f4f2'
/** Radio de las esquinas de la cubeta y largo del respaldo inclinado en su fondo, en cm. */
const RADIO_CUBETA = 18
const RESPALDO = 30

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
  // Paredes de una pieza con la cubeta de esquinas redondeadas; dentro, el fondo más oscuro con su misma forma, un respaldo
  // inclinado en el extremo izquierdo y, en el derecho, un caño de tubo que sale de la pared y baja hacia dentro.
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const fija = valorVariante(banera, e, 'mampara') === 'fija'
    const cubeta = rectanguloRedondeado(-ancho / 2 + BORDE, -fondo / 2 + BORDE, ancho / 2 - BORDE, fondo / 2 - BORDE, RADIO_CUBETA, 6)
    const oscuro = oscurecer(e.colores.banera ?? LOZA, 0.88)
    const fondoCubeta = alto - HONDO
    const x0 = -ancho / 2 + BORDE
    const xGrifo = ancho / 2 - BORDE - 6
    return [
      extrusion('planta', [[-ancho / 2, -fondo / 2], [ancho / 2, -fondo / 2], [ancho / 2, fondo / 2], [-ancho / 2, fondo / 2]], 0, alto, 'banera', { huecos: [cubeta] }),
      { ...extrusion('planta', cubeta, 0, fondoCubeta, 'banera'), color: oscuro },
      { ...extrusion('alzado', [[x0, fondoCubeta], [x0 + RESPALDO, fondoCubeta], [x0, alto - 6]], -fondo / 2 + BORDE, fondo / 2 - BORDE, 'banera'), color: oscuro },
      tubo([[ancho / 2 - 2, 0, alto - 6], [xGrifo, 0, alto - 6], [xGrifo, 0, alto - 10]], 1.2, 'grifo', { codo: 2.5 }),
      ...(fija ? mampara(e, -ancho / 2, -ancho / 2 + PANEL, alto, alto + MAMPARA, 'grifo') : []),
    ]
  },
  zonasApertura: (e) => espacioDelante(e, 'el espacio de entrada', ESPACIO_DE_ENTRADA_CM),
}
