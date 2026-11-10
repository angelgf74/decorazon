import type { DefinicionTipo } from '../tipos'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { cajaEntera } from '../aperturas'
import { cilindro, revolucion } from '../modelos'
import { elipsoide } from '../perfiles'

const TIERRA = '#4a3a2b'
const TRONCO = '#6b4f35'
/** Lados de cada mata: con las normales lisas, 12 bastan para una forma orgánica y cuestan la mitad que los 24 de siempre. */
const LADOS_MATA = 12

export const planta: DefinicionTipo = {
  id: 'planta', nombre: 'planta', genero: 'f', categoria: 'decoracion', estancias: ['dormitorio', 'salon', 'cocina', 'despacho', 'bano'],
  medidas: { ancho: { min: 20, max: 100, defecto: 40 }, fondo: { min: 20, max: 100, defecto: 40 }, alto: { min: 30, max: 200, defecto: 100 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'maceta', etiqueta: 'Maceta', material: 'ceramica', defecto: '#b9714f' }, { clave: 'hojas', etiqueta: 'Hojas', material: 'tela', defecto: '#5f7f4f' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  // Maceta troncocónica con borde y tierra; un tronco y la copa: pisos de tres matas (elipsoides) alrededor de una central.
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const lado = Math.min(ancho, fondo)
    const radio = lado / 2
    const maceta = Math.min(alto * 0.25, 40)
    const boca = lado * 0.32
    const pie = boca * 0.75
    const copa = maceta + Math.min(10, (alto - maceta) * 0.15)
    const altoCopa = alto - copa
    // Matas algo más altas que anchas: tantos pisos como quepan (de 1 a 4).
    const pisos = Math.min(4, Math.max(1, Math.round(altoCopa / (lado * 0.6))))
    const tramo = altoCopa / pisos
    const matas = Array.from({ length: pisos }, (_, i): PiezaLocal[] => {
      const r = radio * 0.64 * (1 - 0.15 * (i / Math.max(1, pisos - 1)))
      const z0 = copa + i * tramo * 0.85
      const z1 = i === pisos - 1 ? alto : Math.min(alto, z0 + tramo * 1.3)
      return [0, 1, 2].map((k) => {
        const a = Math.PI / 2 + (2 * Math.PI * k) / 3 + (Math.PI / 3) * i
        return revolucion((radio - r) * Math.cos(a), (radio - r) * Math.sin(a), elipsoide(r, z0, z1), 'hojas', { lados: LADOS_MATA })
      })
    }).flat()
    return [
      revolucion(0, 0, [[0, 0], [pie, 0], [boca, maceta - 3], [boca + 1, maceta - 3], [boca + 1, maceta], [boca - 1, maceta], [boca - 1, maceta - 4], [0, maceta - 4]], 'maceta'),
      { ...cilindro(0, 0, boca - 1.3, maceta - 4, maceta - 2.5, 'maceta'), material: 'tela', color: TIERRA },
      { ...cilindro(0, 0, Math.max(1, lado * 0.03), maceta - 3, copa + altoCopa * 0.5, 'maceta'), material: 'madera', color: TRONCO },
      ...matas,
      revolucion(0, 0, elipsoide(radio * 0.6, copa + altoCopa * 0.2, alto), 'hojas', { lados: LADOS_MATA }),
    ]
  },
  zonasApertura: () => [],
}
