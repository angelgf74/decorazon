import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { caja } from '../modelos'

export const alfombra: DefinicionTipo = {
  id: 'alfombra', nombre: 'alfombra', genero: 'f', categoria: 'decoracion', estancias: ['dormitorio', 'salon', 'cocina', 'despacho'],
  medidas: { ancho: { min: 60, max: 400, defecto: 200 }, fondo: { min: 40, max: 400, defecto: 140 }, alto: { min: 1, max: 3, defecto: 1 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'tejido', etiqueta: 'Tejido', material: 'tela', defecto: '#b9a58c' }],
  pisable: true, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d: (e) => [caja(-e.medidas.ancho / 2, -e.medidas.fondo / 2, 0, e.medidas.ancho / 2, e.medidas.fondo / 2, e.medidas.alto, 'tejido')],
  zonasApertura: () => [],
}
