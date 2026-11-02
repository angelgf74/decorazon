import type { DefinicionTipo } from '../tipos'
import { cajaEntera, puertasAbatibles } from '../aperturas'
import { caja, frentes, yFrenteCuerpo } from '../modelos'

/** Puertas de espejo: un gris azulado claro y liso (el metal, sin nada alrededor que reflejar, se ve negro). */
const LUNA = '#cfdade'

export const armarioEspejo: DefinicionTipo = {
  id: 'armario-espejo', nombre: 'armario de espejo', genero: 'm', categoria: 'mueble', estancias: ['bano'],
  medidas: { ancho: { min: 40, max: 120, defecto: 60 }, fondo: { min: 10, max: 20, defecto: 15 }, alto: { min: 50, max: 90, defecto: 70 } },
  alturaSuelo: 120, alturaSueloEditable: true,
  variantes: [],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'lacado', defecto: '#f2efe8' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const n = ancho <= 60 ? 1 : 2
    return [
      caja(-ancho / 2, -fondo / 2, 0, ancho / 2, yFrenteCuerpo(e, true), alto, 'cuerpo'),
      ...frentes(e, n, 1, alto - 1, 'cuerpo').map((p) => ({ ...p, material: 'lacado' as const, color: LUNA })),
    ]
  },
  zonasApertura: (e) => puertasAbatibles(e, e.medidas.ancho <= 60 ? 1 : 2),
}
