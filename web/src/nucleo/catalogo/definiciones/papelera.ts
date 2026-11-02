import type { DefinicionTipo } from '../tipos'
import { huellaOvalada } from '../aperturas'
import { ovalo } from '../modelos'

export const papelera: DefinicionTipo = {
  id: 'papelera', nombre: 'papelera', genero: 'f', categoria: 'mueble', estancias: ['despacho', 'bano'],
  medidas: { ancho: { min: 20, max: 40, defecto: 30 }, fondo: { min: 20, max: 40, defecto: 30 }, alto: { min: 25, max: 60, defecto: 35 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'metal', defecto: '#7a7f85' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: (e) => [{ huella: huellaOvalada(e), zMin: e.alturaSuelo, zMax: e.alturaSuelo + e.medidas.alto }],
  modelo3d: (e) => ovalo(e, 0, e.medidas.alto, 'cuerpo'),
  zonasApertura: () => [],
}
