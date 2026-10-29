import type { DefinicionTipo } from '../tipos'
import { cajaEntera, puertasAbatibles } from '../aperturas'

export const frigorifico: DefinicionTipo = {
  id: 'frigorifico', nombre: 'frigorífico', genero: 'm', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 50, max: 95, defecto: 60 }, fondo: { min: 55, max: 80, defecto: 65 }, alto: { min: 140, max: 210, defecto: 185 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'metal', defecto: '#d9dadb' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  zonasApertura: (e) => puertasAbatibles(e, 1),
}
