import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { asientoTapizado } from '../modelos'

export const sillon: DefinicionTipo = {
  id: 'sillon', nombre: 'sillón', genero: 'm', categoria: 'mueble', estancias: ['salon'],
  medidas: { ancho: { min: 60, max: 110, defecto: 80 }, fondo: { min: 70, max: 100, defecto: 85 }, alto: { min: 70, max: 110, defecto: 90 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'tapizado', etiqueta: 'Tapizado', material: 'tela', defecto: '#7d8a7a' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d: (e) => asientoTapizado(e, 1, 'no', 'tapizado'),
  zonasApertura: () => [],
}
