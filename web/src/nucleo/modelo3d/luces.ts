import { hueco } from '../conflictos/estancia'
import type { DocumentoDiseno } from '../modelo/documento'
import { escalar, sumar } from '../geometria/vector'
import type { Vec3 } from './tipos'

/**
 * Luces de dentro de la estancia (M-13): una cálida por lámpara de pie, bajo la pantalla, y una suave de día junto a
 * cada ventana, un poco hacia dentro. El sol (`direccionSol`) ya entra por la ventana más ancha; estas solo rellenan.
 * Con tope: cada luz más es más trabajo por fotograma (la spec pide 60 fps con 40 elementos). Sin sombras.
 */
export interface LuzInterior {
  tipo: 'lampara' | 'ventana'
  posicion: Vec3
  color: string
  intensidad: number
  /** Metros hasta los que llega (más allá, nada). */
  distancia: number
}

export const MAXIMO_LAMPARAS = 4
export const MAXIMO_VENTANAS = 3

/** La luz de la lámpara sale 15 cm por debajo de lo alto de la pantalla. */
const BAJO_LA_PANTALLA_CM = 15
/** La luz de la ventana va 30 cm hacia dentro desde el centro del hueco. */
const DENTRO_DE_LA_VENTANA_CM = 30

export function lucesInteriores(doc: DocumentoDiseno): LuzInterior[] {
  const lamparas: LuzInterior[] = doc.elementos
    .filter((e) => e.tipo === 'lampara-pie')
    .slice(0, MAXIMO_LAMPARAS)
    .map((e) => ({
      tipo: 'lampara',
      posicion: [e.posicion.x / 100, (e.alturaSuelo + e.medidas.alto - BAJO_LA_PANTALLA_CM) / 100, e.posicion.y / 100],
      color: '#ffcf8a',
      intensidad: 1.2,
      distancia: 4,
    }))
  const ventanas: LuzInterior[] = doc.aberturas
    .filter((a) => a.tipo === 'ventana')
    .slice(0, MAXIMO_VENTANAS)
    .map((v) => {
      const h = hueco(doc.estancia.planta, v.pared, v.posicion)
      const p = sumar(sumar(h.cercano, escalar(h.d, v.ancho / 2)), escalar(h.n, DENTRO_DE_LA_VENTANA_CM))
      return {
        tipo: 'ventana',
        posicion: [p.x / 100, (v.alturaSuelo + v.alto / 2) / 100, p.y / 100],
        color: '#eef4ff',
        intensidad: 0.8,
        distancia: 3.5,
      }
    })
  return [...lamparas, ...ventanas]
}
