import type { DefinicionTipo } from '../tipos'
import { cajaEntera, puertasAbatibles } from '../aperturas'

export const moduloAlto: DefinicionTipo = {
  id: 'modulo-alto', nombre: 'módulo alto', genero: 'm', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 15, max: 120, defecto: 60 }, fondo: { min: 25, max: 45, defecto: 35 }, alto: { min: 30, max: 110, defecto: 70 } },
  alturaSuelo: 145, alturaSueloEditable: true,
  variantes: [],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'lacado', defecto: '#f2efe8' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  zonasApertura: (e) => puertasAbatibles(e, e.medidas.ancho <= 60 ? 1 : 2),
}
