import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { mesaConPatas } from '../modelos'

export const mesaCentro: DefinicionTipo = {
  id: 'mesa-centro', nombre: 'mesa de centro', genero: 'f', categoria: 'mueble', estancias: ['salon'],
  medidas: { ancho: { min: 50, max: 150, defecto: 110 }, fondo: { min: 40, max: 90, defecto: 60 }, alto: { min: 30, max: 55, defecto: 45 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'tablero', etiqueta: 'Tablero', material: 'madera', defecto: '#a98462' }],
  pisable: false, bloqueaPaso: true, conjunto: 'estar', sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d: (e) => mesaConPatas(e, 'tablero', 'tablero'),
  zonasApertura: () => [],
}
