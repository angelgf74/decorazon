import type { DefinicionTipo } from '../tipos'
import { cajaMundo } from '../transformar'

export const alfombra: DefinicionTipo = {
  id: 'alfombra', nombre: 'alfombra', genero: 'f', estancias: ['dormitorio', 'salon'],
  medidas: { ancho: { min: 60, max: 400, defecto: 200 }, fondo: { min: 40, max: 400, defecto: 140 }, alto: { min: 1, max: 3, defecto: 1 } },
  alturaSuelo: 0,
  variantes: [],
  zonasColor: [{ clave: 'tejido', etiqueta: 'Tejido', material: 'tela', defecto: '#b9a58c' }],
  pisable: true, bloqueaPaso: false, sobreVentana: false,
  volumenes(e) {
    const { ancho, fondo, alto } = e.medidas
    return [cajaMundo(e, -ancho / 2, -fondo / 2, ancho / 2, fondo / 2, 0, alto)]
  },
  zonasApertura: () => [],
}
