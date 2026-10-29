import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'

export const cortina: DefinicionTipo = {
  id: 'cortina', nombre: 'cortina', genero: 'f', categoria: 'decoracion', estancias: ['dormitorio', 'salon', 'cocina'],
  medidas: { ancho: { min: 60, max: 400, defecto: 160 }, fondo: { min: 5, max: 20, defecto: 10 }, alto: { min: 100, max: 300, defecto: 240 } },
  alturaSuelo: 0, alturaSueloEditable: true,
  variantes: [],
  zonasColor: [{ clave: 'tejido', etiqueta: 'Tejido', material: 'tela', defecto: '#e9e1d3' }],
  pisable: true, bloqueaPaso: false, sobreVentana: true,
  volumenes: cajaEntera,
  zonasApertura: () => [],
}
