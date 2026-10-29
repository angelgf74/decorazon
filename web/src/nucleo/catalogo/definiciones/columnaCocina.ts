import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera, puertaAbatibleAbajo, puertasAbatibles } from '../aperturas'

export const columnaCocina: DefinicionTipo = {
  id: 'columna-cocina', nombre: 'columna de cocina', genero: 'f', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 45, max: 70, defecto: 60 }, fondo: { min: 55, max: 70, defecto: 60 }, alto: { min: 180, max: 240, defecto: 215 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'integrado', etiqueta: 'Integrado', valores: ['horno', 'frigorifico'], defecto: 'horno' }],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'lacado', defecto: '#f2efe8' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  zonasApertura: (e) => valorVariante(columnaCocina, e, 'integrado') === 'horno' ? puertaAbatibleAbajo(e, 60, 85) : puertasAbatibles(e, 1),
}
