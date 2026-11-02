import { capitalizar, type DefinicionVariante } from '../../nucleo'
import { textos } from '../../textos'

type ValorVariante = DefinicionVariante['valores'][number]

/** Cómo se lee el valor de una variante: Sí/No, un número o el texto con mayúscula. */
export const etiquetaValor = (v: ValorVariante): string =>
  typeof v === 'boolean' ? (v ? textos.propiedades.si : textos.propiedades.no) : typeof v === 'number' ? String(v) : capitalizar(v)
