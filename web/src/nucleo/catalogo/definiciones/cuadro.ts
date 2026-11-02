import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { caja } from '../modelos'

export const cuadro: DefinicionTipo = {
  id: 'cuadro', nombre: 'cuadro', genero: 'm', categoria: 'decoracion', estancias: ['dormitorio', 'salon', 'cocina', 'despacho', 'bano'],
  medidas: { ancho: { min: 20, max: 200, defecto: 60 }, fondo: { min: 2, max: 6, defecto: 3 }, alto: { min: 20, max: 150, defecto: 40 } },
  alturaSuelo: 140, alturaSueloEditable: true,
  variantes: [],
  zonasColor: [{ clave: 'marco', etiqueta: 'Marco', material: 'madera', defecto: '#2f2a25' }, { clave: 'lamina', etiqueta: 'Lámina', material: 'lacado', defecto: '#d9cbb0' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const m = 3
    return [
      caja(-ancho / 2, -fondo / 2, 0, ancho / 2, fondo / 2, m, 'marco'),
      caja(-ancho / 2, -fondo / 2, alto - m, ancho / 2, fondo / 2, alto, 'marco'),
      caja(-ancho / 2, -fondo / 2, m, -ancho / 2 + m, fondo / 2, alto - m, 'marco'),
      caja(ancho / 2 - m, -fondo / 2, m, ancho / 2, fondo / 2, alto - m, 'marco'),
      caja(-ancho / 2 + m, -0.3, m, ancho / 2 - m, 0.3, alto - m, 'lamina'),
    ]
  },
  zonasApertura: () => [],
}
