import type { Elemento } from '../../modelo/documento'

export function elementoDe(tipo: string, x: number, y: number, rotacion: number, ancho: number, fondo: number, alto: number, variantes: Elemento['variantes'] = {}): Elemento {
  return { id: 'e1', tipo, posicion: { x, y }, rotacion, medidas: { ancho, fondo, alto }, alturaSuelo: 0, variantes, colores: {}, origen: { tipo: 'generico' } }
}
