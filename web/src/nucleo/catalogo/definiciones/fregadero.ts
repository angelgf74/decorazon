import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'

export const fregadero: DefinicionTipo = {
  id: 'fregadero', nombre: 'fregadero', genero: 'm', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 40, max: 120, defecto: 80 }, fondo: { min: 40, max: 55, defecto: 50 }, alto: { min: 20, max: 45, defecto: 30 } },
  alturaSuelo: 85, alturaSueloEditable: true,
  variantes: [],
  zonasColor: [{ clave: 'cubeta', etiqueta: 'Cubeta', material: 'metal', defecto: '#c0c2c4' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  zonasApertura: () => [],
}
