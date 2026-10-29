import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'

export const planta: DefinicionTipo = {
  id: 'planta', nombre: 'planta', genero: 'f', categoria: 'decoracion', estancias: ['dormitorio', 'salon', 'cocina'],
  medidas: { ancho: { min: 20, max: 100, defecto: 40 }, fondo: { min: 20, max: 100, defecto: 40 }, alto: { min: 30, max: 200, defecto: 100 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'maceta', etiqueta: 'Maceta', material: 'ceramica', defecto: '#b9714f' }, { clave: 'hojas', etiqueta: 'Hojas', material: 'tela', defecto: '#5f7f4f' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  zonasApertura: () => [],
}
