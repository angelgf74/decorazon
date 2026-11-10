import type { DefinicionTipo } from '../tipos'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { cajaEntera } from '../aperturas'
import { caja, extrusion, formaPatas, patas4, tubo, VARIANTE_PATAS } from '../modelos'
import { rectanguloRedondeado } from '../perfiles'

/** Grueso del asiento, lado de las patas y lo que se meten desde la esquina, en cm. */
const ASIENTO = 4
const PATA = 3
const MARGEN = 3

export const taburete: DefinicionTipo = {
  id: 'taburete', nombre: 'taburete', genero: 'm', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 30, max: 45, defecto: 35 }, fondo: { min: 30, max: 45, defecto: 35 }, alto: { min: 45, max: 85, defecto: 75 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [VARIANTE_PATAS],
  zonasColor: [{ clave: 'asiento', etiqueta: 'Asiento', material: 'madera', materiales: ['madera', 'lacado', 'metal'], defecto: '#8b6b4a' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  // Asiento con las esquinas redondeadas y un reposapiés a un 30 % del alto: un aro de tubo con patas redondas, listones con cuadradas.
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const forma = formaPatas(e)
    const x = ancho / 2 - MARGEN - PATA / 2
    const y = fondo / 2 - MARGEN - PATA / 2
    const z = Math.round(alto * 0.3)
    const reposapies: PiezaLocal[] = forma === 'redondas'
      ? [tubo([[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]], 1, 'asiento', { cerrado: true })]
      : [
          ...[-y, y].map((yl) => caja(-x + PATA / 2, yl - 1, z - 1, x - PATA / 2, yl + 1, z + 1, 'asiento')),
          ...[-x, x].map((xl) => caja(xl - 1, -y + PATA / 2, z - 1, xl + 1, y - PATA / 2, z + 1, 'asiento')),
        ]
    return [
      extrusion('planta', rectanguloRedondeado(-ancho / 2, -fondo / 2, ancho / 2, fondo / 2, Math.min(ancho, fondo) * 0.2), alto - ASIENTO, alto, 'asiento'),
      ...patas4(e, PATA, alto - ASIENTO, 'asiento', MARGEN, forma),
      ...reposapies,
    ]
  },
  zonasApertura: () => [],
}
