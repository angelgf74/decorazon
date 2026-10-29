import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { caja, patas4 } from '../modelos'

export const escritorio: DefinicionTipo = {
  id: 'escritorio', nombre: 'escritorio', genero: 'm', categoria: 'mueble', estancias: ['dormitorio', 'salon'],
  medidas: { ancho: { min: 80, max: 200, defecto: 120 }, fondo: { min: 50, max: 80, defecto: 60 }, alto: { min: 70, max: 80, defecto: 75 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'tablero', etiqueta: 'Tablero', material: 'madera', defecto: '#c9a77c' }, { clave: 'patas', etiqueta: 'Patas', material: 'metal', defecto: '#3a3a3a' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    return [caja(-ancho / 2, -fondo / 2, alto - 3, ancho / 2, fondo / 2, alto, 'tablero'), ...patas4(e, 5, alto - 3, 'patas')]
  },
  zonasApertura: () => [],
}
