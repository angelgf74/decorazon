import { valorVariante, type DefinicionTipo } from '../tipos'
import { huellaEntera } from '../aperturas'
import { cajaMundo } from '../transformar'
import type { Elemento } from '../../modelo/documento'
import { caja } from '../modelos'

/** Alto de la campana (sin la chimenea) y lado de la chimenea, en cm. */
const CUERPO = 25
const CHIMENEA_ANCHO = 26
const CHIMENEA_FONDO = 22

/** La chimenea sube pegada a la pared (por detrás) o, en una isla, por el centro. */
function chimenea(e: Elemento): [number, number, number, number] {
  const y0 = valorVariante(campana, e, 'montaje') === 'pared' ? -e.medidas.fondo / 2 : -CHIMENEA_FONDO / 2
  return [-CHIMENEA_ANCHO / 2, y0, CHIMENEA_ANCHO / 2, y0 + CHIMENEA_FONDO]
}

export const campana: DefinicionTipo = {
  id: 'campana', nombre: 'campana', genero: 'f', categoria: 'mueble', estancias: ['cocina'],
  // El alto incluye la chimenea; cuelga a 65 cm sobre una placa a 85.
  medidas: { ancho: { min: 60, max: 120, defecto: 90 }, fondo: { min: 40, max: 60, defecto: 50 }, alto: { min: 40, max: 110, defecto: 90 } },
  alturaSuelo: 150, alturaSueloEditable: true,
  variantes: [{ clave: 'montaje', etiqueta: 'Montaje', valores: ['pared', 'isla'], defecto: 'pared' }],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'metal', defecto: '#c0c2c4' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes(e) {
    const { ancho, fondo, alto } = e.medidas
    const [x0, y0, x1, y1] = chimenea(e)
    return [cajaMundo(e, -ancho / 2, -fondo / 2, ancho / 2, fondo / 2, 0, CUERPO), cajaMundo(e, x0, y0, x1, y1, CUERPO, alto)]
  },
  planta: huellaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const [x0, y0, x1, y1] = chimenea(e)
    return [
      caja(-ancho / 2, -fondo / 2, 0, ancho / 2, fondo / 2, 8, 'cuerpo'),
      // Pirámide aproximada por una caja más estrecha encima.
      caja(-ancho * 0.3, -fondo / 2 + (y0 === -fondo / 2 ? 0 : fondo * 0.2), 8, ancho * 0.3, fondo / 2 - fondo * 0.2, CUERPO, 'cuerpo'),
      caja(x0, y0, CUERPO, x1, y1, alto, 'cuerpo'),
    ]
  },
  zonasApertura: () => [],
}
