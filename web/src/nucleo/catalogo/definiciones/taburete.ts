import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { caja, formaPatas, patas4, VARIANTE_PATAS } from '../modelos'

export const taburete: DefinicionTipo = {
  id: 'taburete', nombre: 'taburete', genero: 'm', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 30, max: 45, defecto: 35 }, fondo: { min: 30, max: 45, defecto: 35 }, alto: { min: 45, max: 85, defecto: 75 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [VARIANTE_PATAS],
  zonasColor: [{ clave: 'asiento', etiqueta: 'Asiento', material: 'madera', defecto: '#8b6b4a' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    return [caja(-ancho / 2, -fondo / 2, alto - 4, ancho / 2, fondo / 2, alto, 'asiento'), ...patas4(e, 3, alto - 4, 'asiento', 3, formaPatas(e))]
  },
  zonasApertura: () => [],
}
