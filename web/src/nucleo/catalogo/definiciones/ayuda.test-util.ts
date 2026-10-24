import type { Elemento } from '../../modelo/documento'
import { catalogoBase } from '../catalogoBase'

let contador = 0

/** Elemento de test con las medidas por defecto del catálogo salvo que se indiquen. */
export function elemento(tipo: string, x: number, y: number, rotacion: number, medidas: Partial<Elemento['medidas']> = {}, variantes: Elemento['variantes'] = {}, id?: string): Elemento {
  contador += 1
  const def = catalogoBase.get(tipo)
  const m = def
    ? { ancho: def.medidas.ancho.defecto, fondo: def.medidas.fondo.defecto, alto: def.medidas.alto.defecto }
    : { ancho: 100, fondo: 100, alto: 100 }
  return {
    id: id ?? `${tipo}-${contador}`, tipo, posicion: { x, y }, rotacion,
    medidas: { ...m, ...medidas }, alturaSuelo: def?.alturaSuelo ?? 0, variantes, colores: {}, origen: { tipo: 'generico' },
  }
}

export function elementoDe(tipo: string, x: number, y: number, rotacion: number, ancho: number, fondo: number, alto: number, variantes: Elemento['variantes'] = {}): Elemento {
  return { id: 'e1', tipo, posicion: { x, y }, rotacion, medidas: { ancho, fondo, alto }, alturaSuelo: 0, variantes, colores: {}, origen: { tipo: 'generico' } }
}
