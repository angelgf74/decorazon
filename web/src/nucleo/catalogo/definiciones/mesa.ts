import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { caja, patas4 } from '../modelos'

export const mesa: DefinicionTipo = {
  id: 'mesa', nombre: 'mesa', genero: 'f', categoria: 'mueble', estancias: ['salon', 'cocina'],
  medidas: { ancho: { min: 60, max: 300, defecto: 140 }, fondo: { min: 60, max: 120, defecto: 80 }, alto: { min: 70, max: 80, defecto: 75 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'tablero', etiqueta: 'Tablero', material: 'madera', defecto: '#a98462' }, { clave: 'patas', etiqueta: 'Patas', material: 'metal', defecto: '#3a3a3a' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    return [caja(-ancho / 2, -fondo / 2, alto - 3, ancho / 2, fondo / 2, alto, 'tablero'), ...patas4(e, 5, alto - 3, 'patas')]
  },
  zonasApertura: () => [],
}
