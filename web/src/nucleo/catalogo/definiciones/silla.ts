import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'

export const silla: DefinicionTipo = {
  id: 'silla', nombre: 'silla', genero: 'f', categoria: 'mueble', estancias: ['dormitorio', 'salon', 'cocina'],
  medidas: { ancho: { min: 40, max: 60, defecto: 45 }, fondo: { min: 40, max: 60, defecto: 50 }, alto: { min: 75, max: 110, defecto: 85 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'asiento', etiqueta: 'Asiento', material: 'madera', defecto: '#8b6b4a' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  zonasApertura: () => [],
}
