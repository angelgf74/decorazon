import { valorVariante, type DefinicionTipo } from '../tipos'
import { espacioAlrededor, huellaEntera, PASO_ALREDEDOR_CM } from '../aperturas'
import { cajaMundo } from '../transformar'
import type { Elemento } from '../../modelo/documento'
import { caja, frentes, tiradores, yFrenteCuerpo } from '../modelos'

/** Voladizo de la barra (por detrás, y local negativa), grueso de la encimera y zócalo, en cm. */
const VOLADIZO = 35
const ENCIMERA = 4
const ZOCALO = 8

/** Dónde empieza el cuerpo por detrás: con barra, el voladizo queda libre para los taburetes. */
const yCuerpo = (e: Elemento) => -e.medidas.fondo / 2 + (valorVariante(isla, e, 'barra') === true ? VOLADIZO : 0)

export const isla: DefinicionTipo = {
  id: 'isla', nombre: 'isla', genero: 'f', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 120, max: 300, defecto: 180 }, fondo: { min: 60, max: 120, defecto: 90 }, alto: { min: 85, max: 95, defecto: 90 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'barra', etiqueta: 'Barra para taburetes', valores: [true, false], defecto: true }],
  zonasColor: [
    { clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'lacado', defecto: '#f2efe8' },
    { clave: 'encimera', etiqueta: 'Encimera', material: 'ceramica', defecto: '#cfc9bd' },
  ],
  // El paso alrededor ya lo vigila su espacio libre de 90 cm: sin el aviso de paso estrecho repetido.
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes(e) {
    const { ancho, fondo, alto } = e.medidas
    return [
      cajaMundo(e, -ancho / 2, yCuerpo(e), ancho / 2, fondo / 2, 0, alto - ENCIMERA),
      cajaMundo(e, -ancho / 2, -fondo / 2, ancho / 2, fondo / 2, alto - ENCIMERA, alto),
    ]
  },
  planta: huellaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const n = Math.max(1, Math.round(ancho / 60))
    const zTope = alto - ENCIMERA
    return [
      caja(-ancho / 2 + 3, yCuerpo(e) + 3, 0, ancho / 2 - 3, yFrenteCuerpo(e, true), ZOCALO, 'cuerpo'),
      caja(-ancho / 2, yCuerpo(e), ZOCALO, ancho / 2, yFrenteCuerpo(e, true), zTope, 'cuerpo'),
      ...frentes(e, n, ZOCALO + 1, zTope - 1, 'cuerpo'),
      ...tiradores(e, n, zTope - 8, 'cuerpo'),
      caja(-ancho / 2, -fondo / 2, zTope, ancho / 2, fondo / 2, alto, 'encimera'),
    ]
  },
  zonasApertura: (e) => espacioAlrededor(e, 'el paso alrededor', PASO_ALREDEDOR_CM),
}
