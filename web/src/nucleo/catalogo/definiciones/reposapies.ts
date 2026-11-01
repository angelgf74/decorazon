import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { caja } from '../modelos'

export const reposapies: DefinicionTipo = {
  id: 'reposapies', nombre: 'reposapiés', genero: 'm', categoria: 'mueble', estancias: ['despacho'],
  medidas: { ancho: { min: 35, max: 60, defecto: 45 }, fondo: { min: 25, max: 45, defecto: 35 }, alto: { min: 8, max: 20, defecto: 12 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'lacado', defecto: '#3a3a3a' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    // Plataforma sobre dos apoyos a lo ancho.
    return [
      caja(-ancho / 2, -fondo / 2, alto - 2, ancho / 2, fondo / 2, alto, 'cuerpo'),
      ...[-fondo / 2 + 2, fondo / 2 - 5].map((y) => caja(-ancho / 2 + 2, y, 0, ancho / 2 - 2, y + 3, alto - 2, 'cuerpo')),
    ]
  },
  zonasApertura: () => [],
}
