import type { DefinicionTipo } from '../tipos'
import { cajaEntera, puertaAbatibleAbajo } from '../aperturas'

export const lavavajillas: DefinicionTipo = {
  id: 'lavavajillas', nombre: 'lavavajillas', genero: 'm', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 45, max: 60, defecto: 60 }, fondo: { min: 55, max: 65, defecto: 60 }, alto: { min: 80, max: 90, defecto: 85 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'frente', etiqueta: 'Frente', material: 'metal', defecto: '#d9dadb' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  zonasApertura: (e) => puertaAbatibleAbajo(e, e.medidas.alto - 15, 10),
}
