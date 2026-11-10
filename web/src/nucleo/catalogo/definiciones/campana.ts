import { valorVariante, type DefinicionTipo } from '../tipos'
import { huellaEntera } from '../aperturas'
import { cajaMundo } from '../transformar'
import type { Elemento } from '../../modelo/documento'
import { caja, extrusion, revolucion } from '../modelos'

/** Alto de la campana (sin la chimenea) y lado de la chimenea, en cm. */
const CUERPO = 25
/** Alto del filtro de abajo, en cm. */
const FILTRO = 8
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
  // Filtro de 8 cm, el cuerpo que se estrecha hasta la chimenea y la chimenea. En isla, el cuerpo es una pirámide truncada
  // (revolución de 4 lados, el radio hasta las esquinas); en pared, una cuña de perfil pegada a ella que sube hasta el fondo de
  // la chimenea (una revolución, centrada, dejaría un hueco contra la pared).
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const [x0, y0, x1, y1] = chimenea(e)
    const cuerpo = valorVariante(campana, e, 'montaje') === 'isla'
      ? revolucion(0, 0, [[0, FILTRO], [(ancho / 2) * Math.SQRT2, FILTRO], [(CHIMENEA_ANCHO / 2) * Math.SQRT2, CUERPO], [0, CUERPO]], 'cuerpo', { lados: 4, escalaY: fondo / ancho })
      : extrusion('perfil', [[-fondo / 2, FILTRO], [fondo / 2, FILTRO], [-fondo / 2 + CHIMENEA_FONDO, CUERPO], [-fondo / 2, CUERPO]], -ancho / 2, ancho / 2, 'cuerpo')
    return [caja(-ancho / 2, -fondo / 2, 0, ancho / 2, fondo / 2, FILTRO, 'cuerpo'), cuerpo, caja(x0, y0, CUERPO, x1, y1, alto, 'cuerpo')]
  },
  zonasApertura: () => [],
}
