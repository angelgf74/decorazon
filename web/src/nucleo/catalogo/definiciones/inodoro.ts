import { valorVariante, type DefinicionTipo } from '../tipos'
import { ESPACIO_DE_USO_CM, espacioDelante, huellaEntera } from '../aperturas'
import { cajaMundo } from '../transformar'
import { caja, taza } from '../modelos'

/** Alto de la taza con el asiento y fondo de la cisterna, en cm. */
const TAZA = 40
const CISTERNA = 18

export const inodoro: DefinicionTipo = {
  id: 'inodoro', nombre: 'inodoro', genero: 'm', categoria: 'mueble', estancias: ['bano'],
  medidas: { ancho: { min: 35, max: 45, defecto: 38 }, fondo: { min: 48, max: 75, defecto: 66 }, alto: { min: 70, max: 90, defecto: 78 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'cisterna', etiqueta: 'Cisterna vista', valores: [true, false], defecto: true }],
  zonasColor: [{ clave: 'loza', etiqueta: 'Loza', material: 'ceramica', defecto: '#f4f4f2' }],
  // Su espacio de uso hace de paso: entre sanitarios no se avisa de pasos estrechos.
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes(e) {
    const { ancho, fondo, alto } = e.medidas
    const base = cajaMundo(e, -ancho / 2, -fondo / 2, ancho / 2, fondo / 2, 0, TAZA)
    if (valorVariante(inodoro, e, 'cisterna') !== true) return [base]
    return [base, cajaMundo(e, -ancho / 2, -fondo / 2, ancho / 2, -fondo / 2 + CISTERNA, TAZA, alto)]
  },
  planta: huellaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const cisterna = valorVariante(inodoro, e, 'cisterna') === true
    return [
      caja(-ancho / 2 + 6, -fondo / 2, 0, ancho / 2 - 6, fondo / 2 - 8, 30, 'loza'),
      ...taza(e, -fondo / 2, 30, TAZA - 2, 'loza'),
      ...taza(e, cisterna ? -fondo / 2 + CISTERNA : -fondo / 2, TAZA - 2, TAZA, 'loza'),
      ...(cisterna ? [caja(-ancho / 2, -fondo / 2, TAZA, ancho / 2, -fondo / 2 + CISTERNA, alto, 'loza')] : []),
    ]
  },
  zonasApertura: (e) => espacioDelante(e, 'el espacio de uso', ESPACIO_DE_USO_CM, Math.max(e.medidas.ancho, ESPACIO_DE_USO_CM)),
}
