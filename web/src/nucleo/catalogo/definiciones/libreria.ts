import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { caja } from '../modelos'

/** Ancho máximo de cada módulo, separación entre baldas y grueso de los tableros, en cm. */
const MODULO = 80
const ENTRE_BALDAS = 35
const GRUESO = 2.5

export const libreria: DefinicionTipo = {
  id: 'libreria', nombre: 'librería', genero: 'f', categoria: 'mueble', estancias: ['salon', 'despacho', 'dormitorio'],
  medidas: { ancho: { min: 80, max: 300, defecto: 160 }, fondo: { min: 25, max: 40, defecto: 30 }, alto: { min: 180, max: 260, defecto: 220 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'madera', materiales: ['madera', 'lacado'], defecto: '#c9a77c' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const modulos = Math.ceil(ancho / MODULO)
    const w = ancho / modulos
    const baldas = Math.floor((alto - GRUESO) / ENTRE_BALDAS)
    return [
      // Costados y separaciones de los módulos.
      ...Array.from({ length: modulos + 1 }, (_, i) => {
        const x = Math.min(Math.max(-ancho / 2 + i * w - GRUESO / 2, -ancho / 2), ancho / 2 - GRUESO)
        return caja(x, -fondo / 2, 0, x + GRUESO, fondo / 2, alto, 'cuerpo')
      }),
      caja(-ancho / 2, -fondo / 2, alto - GRUESO, ancho / 2, fondo / 2, alto, 'cuerpo'),
      caja(-ancho / 2, -fondo / 2, 0, ancho / 2, fondo / 2, GRUESO, 'cuerpo'),
      ...Array.from({ length: baldas - 1 }, (_, i) => caja(-ancho / 2, -fondo / 2, ENTRE_BALDAS * (i + 1), ancho / 2, fondo / 2, ENTRE_BALDAS * (i + 1) + GRUESO, 'cuerpo')),
    ]
  },
  zonasApertura: () => [],
}
