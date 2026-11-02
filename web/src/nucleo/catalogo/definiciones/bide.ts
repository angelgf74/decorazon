import type { DefinicionTipo } from '../tipos'
import { cajaEntera, ESPACIO_DE_USO_CM, espacioDelante } from '../aperturas'
import { caja, cilindro, oscurecer, taza } from '../modelos'

const LOZA = '#f4f4f2'

export const bide: DefinicionTipo = {
  id: 'bide', nombre: 'bidé', genero: 'm', categoria: 'mueble', estancias: ['bano'],
  medidas: { ancho: { min: 35, max: 40, defecto: 36 }, fondo: { min: 48, max: 60, defecto: 54 }, alto: { min: 38, max: 42, defecto: 40 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'loza', etiqueta: 'Loza', material: 'ceramica', defecto: LOZA }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    return [
      caja(-ancho / 2 + 6, -fondo / 2, 0, ancho / 2 - 6, fondo / 2 - 8, alto - 12, 'loza'),
      ...taza(e, -fondo / 2, alto - 12, alto - 0.2, 'loza'),
      // Hueco de la taza, más oscuro, para que se lea desde arriba.
      { ...cilindro(0, fondo / 2 - ancho / 2, ancho / 2 - 5, alto - 0.5, alto, 'loza'), color: oscurecer(e.colores.loza ?? LOZA, 0.85) },
    ]
  },
  zonasApertura: (e) => espacioDelante(e, 'el espacio de uso', ESPACIO_DE_USO_CM, Math.max(e.medidas.ancho, ESPACIO_DE_USO_CM)),
}
