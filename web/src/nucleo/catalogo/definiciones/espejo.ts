import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { caja, marco } from '../modelos'

/** Luna de espejo: un gris azulado claro y liso (el metal, sin nada alrededor que reflejar, se ve negro). */
const LUNA = '#cfdade'

export const espejo: DefinicionTipo = {
  id: 'espejo', nombre: 'espejo', genero: 'm', categoria: 'decoracion', estancias: ['bano'],
  medidas: { ancho: { min: 30, max: 160, defecto: 70 }, fondo: { min: 2, max: 5, defecto: 3 }, alto: { min: 40, max: 120, defecto: 80 } },
  alturaSuelo: 110, alturaSueloEditable: true,
  variantes: [],
  zonasColor: [{ clave: 'marco', etiqueta: 'Marco', material: 'metal', defecto: '#9a9a96' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const m = 2
    return [
      marco(e, m, 'marco'),
      { ...caja(-ancho / 2 + m, -fondo / 2, m, ancho / 2 - m, fondo / 2 - 0.5, alto - m, 'marco'), material: 'lacado', color: LUNA },
    ]
  },
  zonasApertura: () => [],
}
