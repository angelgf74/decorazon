import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { caja, cilindro } from '../modelos'

const PROFUNDIDAD_CUBETA = 18

export const fregadero: DefinicionTipo = {
  id: 'fregadero', nombre: 'fregadero', genero: 'm', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 40, max: 120, defecto: 80 }, fondo: { min: 40, max: 55, defecto: 50 }, alto: { min: 20, max: 45, defecto: 30 } },
  alturaSuelo: 85, alturaSueloEditable: true,
  variantes: [],
  zonasColor: [{ clave: 'cubeta', etiqueta: 'Cubeta', material: 'metal', defecto: '#c0c2c4' }],
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
      // Fondo más oscuro dentro del reborde: sobre el módulo macizo de debajo, el interior se lee como cubeta.
      { ...caja(-ancho / 2 + g, -fondo / 2 + g, 0, ancho / 2 - g, fondo / 2 - g, 0.5, 'cubeta'), material: 'metal', color: '#8a8c8e' },
      cilindro(0, yGrifo, 1.5, 1, h, 'cubeta'),
      cilindro(0, yGrifo + 5, 1, h - 2, h, 'cubeta'),
    ]
  },
  zonasApertura: () => [],
}
