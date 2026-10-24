import type { DocumentoDiseno, TipoEstancia } from './documento'

export function documentoNuevo(tipo: TipoEstancia, ancho: number, largo: number, alto: number): DocumentoDiseno {
  return {
    formato: 1,
    estancia: {
      tipo,
      alto,
      grosorPared: 10,
      planta: [{ x: 0, y: 0 }, { x: ancho, y: 0 }, { x: ancho, y: largo }, { x: 0, y: largo }],
      colorParedes: '#f4f1ea',
      colorSuelo: '#c8a77e',
    },
    aberturas: [],
    estructura: [],
    elementos: [],
  }
}
