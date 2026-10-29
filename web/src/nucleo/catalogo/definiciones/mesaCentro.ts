import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { caja, patas4 } from '../modelos'

export const mesaCentro: DefinicionTipo = {
  id: 'mesa-centro', nombre: 'mesa de centro', genero: 'f', categoria: 'mueble', estancias: ['salon'],
  medidas: { ancho: { min: 50, max: 150, defecto: 110 }, fondo: { min: 40, max: 90, defecto: 60 }, alto: { min: 30, max: 55, defecto: 45 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'tablero', etiqueta: 'Tablero', material: 'madera', defecto: '#a98462' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    return [caja(-ancho / 2, -fondo / 2, alto - 3, ancho / 2, fondo / 2, alto, 'tablero'), ...patas4(e, 5, alto - 3, 'tablero')]
  },
  zonasApertura: () => [],
}
