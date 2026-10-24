export type TipoConflicto = 'fueraDeEstancia' | 'solape' | 'techo' | 'viga' | 'apertura' | 'tapaVentana' | 'tapaRadiador' | 'pasoEstrecho'

export interface Conflicto {
  tipo: TipoConflicto
  gravedad: 'error' | 'aviso'
  /** `ids[0]` es el elemento al que se atribuye el conflicto; un tramo de pared en un paso estrecho es `'pared:<índice>'`. */
  ids: string[]
  cantidadCm: number
  mensaje: string
}
