import type { DefinicionTipo } from '../tipos'
import { huellaOvalada } from '../aperturas'
import { revolucion } from '../modelos'

/** Grueso de la pared y del fondo, en cm; abajo, la boca se estrecha a este tanto. */
const PARED = 0.6
const ESTRECHA = 0.78

export const papelera: DefinicionTipo = {
  id: 'papelera', nombre: 'papelera', genero: 'f', categoria: 'mueble', estancias: ['despacho', 'bano'],
  medidas: { ancho: { min: 20, max: 40, defecto: 30 }, fondo: { min: 20, max: 40, defecto: 30 }, alto: { min: 25, max: 60, defecto: 35 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'metal', defecto: '#7a7f85' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: (e) => [{ huella: huellaOvalada(e), zMin: e.alturaSuelo, zMax: e.alturaSuelo + e.medidas.alto }],
  // Cubo de revolución, ovalado si no es redondo, abierto arriba y más estrecho abajo: sube por fuera y baja por dentro.
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const boca = ancho / 2
    const pie = boca * ESTRECHA
    return [revolucion(0, 0, [[0, 0], [pie, 0], [boca, alto], [boca - PARED, alto], [pie - PARED, 1], [0, 1]], 'cuerpo', { escalaY: fondo / ancho })]
  },
  zonasApertura: () => [],
}
