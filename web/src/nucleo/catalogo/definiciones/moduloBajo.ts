import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera, cajones, puertasAbatibles } from '../aperturas'

export const moduloBajo: DefinicionTipo = {
  id: 'modulo-bajo', nombre: 'módulo bajo', genero: 'm', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 15, max: 120, defecto: 60 }, fondo: { min: 45, max: 70, defecto: 60 }, alto: { min: 70, max: 95, defecto: 85 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'frente', etiqueta: 'Frente', valores: ['puertas', 'cajones'], defecto: 'puertas' }],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'lacado', defecto: '#f2efe8' }, { clave: 'encimera', etiqueta: 'Encimera', material: 'ceramica', defecto: '#cfc9bd' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  zonasApertura: (e) => valorVariante(moduloBajo, e, 'frente') === 'cajones' ? cajones(e, e.medidas.fondo - 5) : puertasAbatibles(e, e.medidas.ancho <= 60 ? 1 : 2),
}
