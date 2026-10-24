import type { DefinicionTipo } from '../tipos'
import { cajaMundo } from '../transformar'

export const comoda: DefinicionTipo = {
  id: 'comoda', nombre: 'cómoda', genero: 'f', estancias: ['dormitorio', 'salon'],
  medidas: { ancho: { min: 40, max: 200, defecto: 100 }, fondo: { min: 35, max: 60, defecto: 50 }, alto: { min: 50, max: 130, defecto: 85 } },
  alturaSuelo: 0,
  variantes: [{ clave: 'cajones', etiqueta: 'Cajones', valores: [3, 4, 5, 6], defecto: 4 }],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'madera', defecto: '#a98462' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes(e) {
    const { ancho, fondo, alto } = e.medidas
    return [cajaMundo(e, -ancho / 2, -fondo / 2, ancho / 2, fondo / 2, 0, alto)]
  },
  zonasApertura(e) {
    const { ancho, fondo, alto } = e.medidas
    const caja = cajaMundo(e, -ancho / 2, fondo / 2, ancho / 2, fondo / 2 + (fondo - 5), 0, alto)
    return [{ nombre: 'el cajón', ...caja }]
  },
}
