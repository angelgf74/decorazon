import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { caja } from '../modelos'

export const estanteria: DefinicionTipo = {
  id: 'estanteria', nombre: 'estantería', genero: 'f', categoria: 'mueble', estancias: ['dormitorio', 'salon', 'despacho', 'bano'],
  medidas: { ancho: { min: 40, max: 200, defecto: 80 }, fondo: { min: 20, max: 50, defecto: 30 }, alto: { min: 60, max: 240, defecto: 180 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'madera', defecto: '#c9a77c' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const baldas = Math.floor((alto - 6) / 35)
    return [
      caja(-ancho / 2, -fondo / 2, 0, -ancho / 2 + 3, fondo / 2, alto, 'cuerpo'),
      caja(ancho / 2 - 3, -fondo / 2, 0, ancho / 2, fondo / 2, alto, 'cuerpo'),
      caja(-ancho / 2 + 3, -fondo / 2, alto - 3, ancho / 2 - 3, fondo / 2, alto, 'cuerpo'),
      caja(-ancho / 2 + 3, -fondo / 2, 0, ancho / 2 - 3, fondo / 2, 3, 'cuerpo'),
      ...Array.from({ length: baldas }, (_, i) => caja(-ancho / 2 + 3, -fondo / 2, 35 * (i + 1), ancho / 2 - 3, fondo / 2, 35 * (i + 1) + 3, 'cuerpo')),
    ]
  },
  zonasApertura: () => [],
}
