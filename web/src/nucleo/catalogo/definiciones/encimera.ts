import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'

export const encimera: DefinicionTipo = {
  id: 'encimera', nombre: 'encimera', genero: 'f', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 30, max: 300, defecto: 120 }, fondo: { min: 40, max: 120, defecto: 60 }, alto: { min: 2, max: 6, defecto: 4 } },
  alturaSuelo: 81, alturaSueloEditable: true,
  variantes: [],
  zonasColor: [{ clave: 'encimera', etiqueta: 'Encimera', material: 'ceramica', defecto: '#cfc9bd' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  zonasApertura: () => [],
}
