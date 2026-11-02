import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { caja, cilindro } from '../modelos'

const PROFUNDIDAD_CUBETA = 18
const COLOR_CUBETA = '#c0c2c4'

/** El mismo color con cada canal multiplicado por `k`; lo que no sea #rrggbb queda igual. */
function oscurecer(hex: string, k: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex
  return `#${[1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('')}`
}

export const fregadero: DefinicionTipo = {
  id: 'fregadero', nombre: 'fregadero', genero: 'm', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 40, max: 120, defecto: 80 }, fondo: { min: 40, max: 55, defecto: 50 }, alto: { min: 20, max: 45, defecto: 30 } },
  alturaSuelo: 85, alturaSueloEditable: true,
  variantes: [],
  zonasColor: [{ clave: 'cubeta', etiqueta: 'Cubeta', material: 'metal', defecto: COLOR_CUBETA }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const g = 2
    const h = Math.min(alto, 25)
    const yGrifo = -fondo / 2 + 1.5
    // La cubeta baja bajo la encimera, pero nunca por debajo del suelo (la altura se puede editar hasta 0).
    const cubeta = -Math.min(PROFUNDIDAD_CUBETA, e.alturaSuelo)
    return [
      caja(-ancho / 2, -fondo / 2, cubeta, ancho / 2, -fondo / 2 + g, 1, 'cubeta'),
      caja(-ancho / 2, fondo / 2 - g, cubeta, ancho / 2, fondo / 2, 1, 'cubeta'),
      caja(-ancho / 2, -fondo / 2 + g, cubeta, -ancho / 2 + g, fondo / 2 - g, 1, 'cubeta'),
      caja(ancho / 2 - g, -fondo / 2 + g, cubeta, ancho / 2, fondo / 2 - g, 1, 'cubeta'),
      // Fondo más oscuro dentro del reborde, del color elegido: sobre el módulo macizo de debajo, el interior se lee como cubeta.
      { ...caja(-ancho / 2 + g, -fondo / 2 + g, 0, ancho / 2 - g, fondo / 2 - g, 0.5, 'cubeta'), material: 'metal', color: oscurecer(e.colores.cubeta ?? COLOR_CUBETA, 0.72) },
      // Grifo: base, caño hasta la salida y salida.
      cilindro(0, yGrifo, 1.5, 1, h, 'cubeta'),
      caja(-1, yGrifo, h - 2, 1, yGrifo + 5, h, 'cubeta'),
      cilindro(0, yGrifo + 5, 1, h - 2, h, 'cubeta'),
    ]
  },
  zonasApertura: () => [],
}
