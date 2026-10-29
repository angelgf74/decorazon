import type { Elemento, Medidas } from '../modelo/documento'
import type { Punto } from '../geometria/vector'
import type { DefinicionTipo } from './tipos'

/** Elemento recién colocado: medidas, variantes y colores por defecto. */
export function elementoNuevo(def: DefinicionTipo, posicion: Punto, id: string = crypto.randomUUID()): Elemento {
  return {
    id, tipo: def.id, posicion, rotacion: 0,
    medidas: { ancho: def.medidas.ancho.defecto, fondo: def.medidas.fondo.defecto, alto: def.medidas.alto.defecto },
    alturaSuelo: def.alturaSuelo,
    variantes: Object.fromEntries(def.variantes.map((v) => [v.clave, v.defecto])),
    colores: Object.fromEntries(def.zonasColor.map((z) => [z.clave, z.defecto])),
    origen: { tipo: 'generico' },
  }
}

/** Redondea a entero y recorta a cada rango. */
export function ajustarMedidas(def: DefinicionTipo, m: Medidas): Medidas {
  const aj = (v: number, r: { min: number; max: number }) => Math.min(r.max, Math.max(r.min, Math.round(v)))
  return { ancho: aj(m.ancho, def.medidas.ancho), fondo: aj(m.fondo, def.medidas.fondo), alto: aj(m.alto, def.medidas.alto) }
}
