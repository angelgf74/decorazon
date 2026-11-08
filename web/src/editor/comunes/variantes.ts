import { capitalizar, type DefinicionVariante } from '../../nucleo'
import { textos } from '../../textos'

type ValorVariante = DefinicionVariante['valores'][number]

/** Cómo se lee el valor de una variante: la etiqueta del tipo si la tiene; si no, Sí/No, un número o el texto con mayúscula. */
export const etiquetaValor = (v: ValorVariante, variante?: DefinicionVariante): string =>
  variante?.etiquetas?.[String(v)] ?? (typeof v === 'boolean' ? (v ? textos.propiedades.si : textos.propiedades.no) : typeof v === 'number' ? String(v) : capitalizar(v))
