import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera, puertasAbatibles } from '../aperturas'
import { cuerpoConZocalo } from '../modelos'

export const aparador: DefinicionTipo = {
  id: 'aparador', nombre: 'aparador', genero: 'm', categoria: 'mueble', estancias: ['salon'],
  medidas: { ancho: { min: 80, max: 240, defecto: 160 }, fondo: { min: 35, max: 55, defecto: 45 }, alto: { min: 60, max: 110, defecto: 80 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'puertas', etiqueta: 'Puertas', valores: [2, 3, 4], defecto: 2 }],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'madera', defecto: '#8b6b4a' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d: (e) => cuerpoConZocalo(e, Number(valorVariante(aparador, e, 'puertas')), 'cuerpo'),
  zonasApertura: (e) => puertasAbatibles(e, Number(valorVariante(aparador, e, 'puertas'))),
}
