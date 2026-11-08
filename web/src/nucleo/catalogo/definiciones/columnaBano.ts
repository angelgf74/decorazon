import type { DefinicionTipo } from '../tipos'
import { cajaEntera, puertasAbatibles } from '../aperturas'
import { cuerpoConZocalo } from '../modelos'

export const columnaBano: DefinicionTipo = {
  id: 'columna-bano', nombre: 'columna de baño', genero: 'f', categoria: 'mueble', estancias: ['bano'],
  medidas: { ancho: { min: 30, max: 60, defecto: 35 }, fondo: { min: 25, max: 40, defecto: 30 }, alto: { min: 120, max: 190, defecto: 170 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'lacado', materiales: ['lacado', 'madera'], defecto: '#f2efe8' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d: (e) => cuerpoConZocalo(e, 1, 'cuerpo'),
  zonasApertura: (e) => puertasAbatibles(e, 1),
}
