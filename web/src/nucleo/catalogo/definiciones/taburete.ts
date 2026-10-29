import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'

export const taburete: DefinicionTipo = {
  id: 'taburete', nombre: 'taburete', genero: 'm', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 30, max: 45, defecto: 35 }, fondo: { min: 30, max: 45, defecto: 35 }, alto: { min: 45, max: 85, defecto: 75 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'asiento', etiqueta: 'Asiento', material: 'madera', defecto: '#8b6b4a' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  zonasApertura: () => [],
}
