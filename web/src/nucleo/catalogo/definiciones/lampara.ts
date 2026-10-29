import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'

export const lampara: DefinicionTipo = {
  id: 'lampara-pie', nombre: 'lámpara de pie', genero: 'f', categoria: 'decoracion', estancias: ['dormitorio', 'salon', 'cocina'],
  medidas: { ancho: { min: 25, max: 60, defecto: 40 }, fondo: { min: 25, max: 60, defecto: 40 }, alto: { min: 120, max: 200, defecto: 160 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'pantalla', etiqueta: 'Pantalla', material: 'tela', defecto: '#efe6d6' }, { clave: 'pie', etiqueta: 'Pie', material: 'metal', defecto: '#3a3a3a' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  zonasApertura: () => [],
}
