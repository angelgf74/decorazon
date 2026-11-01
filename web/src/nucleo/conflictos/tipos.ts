import type { Punto } from '../geometria/vector'

export type TipoConflicto = 'fueraDeEstancia' | 'solape' | 'techo' | 'viga' | 'apertura' | 'tapaVentana' | 'tapaRadiador' | 'pasoEstrecho'

export interface Conflicto {
  tipo: TipoConflicto
  gravedad: 'error' | 'aviso'
  /** `ids[0]` es el elemento al que se atribuye el conflicto; un tramo de pared en un paso estrecho es `'pared:<índice>'`. */
  ids: string[]
  cantidadCm: number
  mensaje: string
  /** Polígono en planta (mundo) que choca, para pintarlo en rojo. Los pasos estrechos no lo llevan. */
  zona?: Punto[]
  /** Parte de `zona` que no choca (la que queda dentro de la estancia); se pinta como hueco de la zona. Solo en `fueraDeEstancia`. */
  huecoDeZona?: Punto[]
}
