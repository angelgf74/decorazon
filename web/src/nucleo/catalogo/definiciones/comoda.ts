import type { DefinicionTipo } from '../tipos'
import { cajaEntera, cajones } from '../aperturas'

export const comoda: DefinicionTipo = {
  id: 'comoda', nombre: 'cómoda', genero: 'f', categoria: 'mueble', estancias: ['dormitorio', 'salon'],
  medidas: { ancho: { min: 40, max: 200, defecto: 100 }, fondo: { min: 35, max: 60, defecto: 50 }, alto: { min: 50, max: 130, defecto: 85 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'cajones', etiqueta: 'Cajones', valores: [3, 4, 5, 6], defecto: 4 }],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'madera', defecto: '#a98462' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  zonasApertura: (e) => cajones(e, e.medidas.fondo - 5),
}
