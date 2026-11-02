import { valorVariante, type DefinicionTipo } from '../tipos'
import { ESPACIO_DE_USO_CM, espacioDelante, huellaEntera } from '../aperturas'
import { cajaMundo } from '../transformar'
import type { Elemento } from '../../modelo/documento'
import { caja, cilindro, frentes, oscurecer, tiradores, yFrenteCuerpo } from '../modelos'

/** Grueso de la encimera, alto del mueble suspendido, alto del grifo sobre la encimera y ancho mínimo para dos senos, en cm. */
const ENCIMERA = 3
const MUEBLE_SUSPENDIDO = 50
const GRIFO = 18
const ANCHO_DOS_SENOS = 100
/** Lo que separa el grifo de la pared: más que el fondo de un espejo, que puede colgar sobre él. */
const SEPARACION_GRIFO = 6
const LOZA = '#f4f4f2'

/** Centro en x de cada seno. */
function senos(e: Elemento): number[] {
  const { ancho } = e.medidas
  return valorVariante(lavabo, e, 'senos') === 2 ? [-ancho / 4, ancho / 4] : [0]
}

export const lavabo: DefinicionTipo = {
  id: 'lavabo', nombre: 'lavabo', genero: 'm', categoria: 'mueble', estancias: ['bano'],
  // El alto es el de la encimera desde el suelo.
  medidas: { ancho: { min: 40, max: 160, defecto: 80 }, fondo: { min: 35, max: 55, defecto: 46 }, alto: { min: 75, max: 95, defecto: 85 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [
    { clave: 'montaje', etiqueta: 'Mueble', valores: ['suspendido', 'al suelo'], defecto: 'suspendido' },
    // Con menos de 1 m de ancho no caben dos.
    { clave: 'senos', etiqueta: 'Senos', valores: [1, 2], defecto: 1, valoresPara: (e) => (e.medidas.ancho >= ANCHO_DOS_SENOS ? [1, 2] : [1]) },
  ],
  zonasColor: [
    { clave: 'mueble', etiqueta: 'Mueble', material: 'madera', defecto: '#8b6b4a' },
    { clave: 'lavabo', etiqueta: 'Lavabo', material: 'ceramica', defecto: LOZA },
    { clave: 'grifo', etiqueta: 'Grifo', material: 'metal', defecto: '#c0c2c4' },
  ],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes(e) {
    const { ancho, fondo, alto } = e.medidas
    const z0 = valorVariante(lavabo, e, 'montaje') === 'suspendido' ? alto - MUEBLE_SUSPENDIDO : 0
    return [
      cajaMundo(e, -ancho / 2, -fondo / 2, ancho / 2, fondo / 2, z0, alto),
      ...senos(e).map((x) => cajaMundo(e, x - 2.5, -fondo / 2 + SEPARACION_GRIFO, x + 2.5, -fondo / 2 + 15, alto, alto + GRIFO)),
    ]
  },
  planta: huellaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const suspendido = valorVariante(lavabo, e, 'montaje') === 'suspendido'
    const z0 = suspendido ? alto - MUEBLE_SUSPENDIDO : 0
    const zCuerpo = suspendido ? z0 : 8
    const zTablero = alto - ENCIMERA
    const puertas = ancho <= 60 ? 1 : 2
    const xs = senos(e)
    const anchoSeno = Math.min(ancho / xs.length - 12, 50)
    const yGrifo = -fondo / 2 + SEPARACION_GRIFO + 1.5
    return [
      ...(suspendido ? [] : [caja(-ancho / 2 + 3, -fondo / 2 + 3, 0, ancho / 2 - 3, yFrenteCuerpo(e, true), 8, 'mueble')]),
      caja(-ancho / 2, -fondo / 2, zCuerpo, ancho / 2, yFrenteCuerpo(e, true), zTablero, 'mueble'),
      ...frentes(e, puertas, zCuerpo + 1, zTablero - 1, 'mueble'),
      ...tiradores(e, puertas, zTablero - 8, 'mueble'),
      caja(-ancho / 2, -fondo / 2, zTablero, ancho / 2, fondo / 2, alto, 'lavabo'),
      ...xs.flatMap((x) => [
        { ...caja(x - anchoSeno / 2, -fondo / 2 + 13, alto - 0.5, x + anchoSeno / 2, fondo / 2 - 5, alto + 0.2, 'lavabo'), color: oscurecer(e.colores.lavabo ?? LOZA, 0.85) },
        cilindro(x, yGrifo, 1.5, alto, alto + GRIFO, 'grifo'),
        caja(x - 1, yGrifo, alto + GRIFO - 2, x + 1, yGrifo + 8, alto + GRIFO, 'grifo'),
      ]),
    ]
  },
  zonasApertura: (e) => espacioDelante(e, 'el espacio de uso', ESPACIO_DE_USO_CM, Math.max(e.medidas.ancho, ESPACIO_DE_USO_CM)),
}
