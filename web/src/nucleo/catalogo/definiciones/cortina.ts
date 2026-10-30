import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { caja } from '../modelos'

export const cortina: DefinicionTipo = {
  id: 'cortina', nombre: 'cortina', genero: 'f', categoria: 'decoracion', estancias: ['dormitorio', 'salon', 'cocina'],
  medidas: { ancho: { min: 60, max: 400, defecto: 160 }, fondo: { min: 5, max: 20, defecto: 10 }, alto: { min: 100, max: 300, defecto: 240 } },
  alturaSuelo: 0, alturaSueloEditable: true,
  variantes: [],
  zonasColor: [{ clave: 'tejido', etiqueta: 'Tejido', material: 'tela', defecto: '#e9e1d3' }],
  pisable: true, bloqueaPaso: false, sobreVentana: true,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const w = ancho / 4 / 5
    const panos = [-ancho / 2, ancho / 4].flatMap((x0) =>
      Array.from({ length: 5 }, (_, i) => {
        const y0 = i % 2 === 0 ? -fondo / 2 : fondo / 2 - 2
        return caja(x0 + i * w, y0, 0, x0 + (i + 1) * w, y0 + 2, alto - 3, 'tejido')
      }))
    return [...panos, { ...caja(-ancho / 2, -1, alto - 2.5, ancho / 2, 1, alto, 'tejido'), material: 'metal' as const, color: '#8a8a8a' }]
  },
  zonasApertura: () => [],
}
