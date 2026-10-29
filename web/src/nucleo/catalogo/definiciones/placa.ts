import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'

export const placa: DefinicionTipo = {
  id: 'placa', nombre: 'placa', genero: 'f', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 30, max: 90, defecto: 60 }, fondo: { min: 40, max: 55, defecto: 52 }, alto: { min: 1, max: 10, defecto: 5 } },
  alturaSuelo: 85, alturaSueloEditable: true,
  variantes: [],
  zonasColor: [{ clave: 'superficie', etiqueta: 'Superficie', material: 'vidrio', defecto: '#1f1f1f' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  zonasApertura: () => [],
}
