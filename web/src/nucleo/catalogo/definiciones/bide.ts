import type { DefinicionTipo } from '../tipos'
import { cajaEntera, ESPACIO_DE_USO_CM, espacioDelante } from '../aperturas'
import { oscurecer, tazaDeLoza } from '../modelos'

const LOZA = '#f4f4f2'

export const bide: DefinicionTipo = {
  id: 'bide', nombre: 'bidé', genero: 'm', categoria: 'mueble', estancias: ['bano'],
  medidas: { ancho: { min: 35, max: 40, defecto: 36 }, fondo: { min: 48, max: 60, defecto: 54 }, alto: { min: 38, max: 42, defecto: 40 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'loza', etiqueta: 'Loza', material: 'ceramica', defecto: LOZA }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  // La misma taza ovalada que el inodoro, contra la pared y con el borde en el alto; el fondo, más oscuro.
  modelo3d: (e) => tazaDeLoza(e, -e.medidas.fondo / 2, e.medidas.alto, 'loza', oscurecer(e.colores.loza ?? LOZA, 0.85)),
  zonasApertura: (e) => espacioDelante(e, 'el espacio de uso', ESPACIO_DE_USO_CM, Math.max(e.medidas.ancho, ESPACIO_DE_USO_CM)),
}
