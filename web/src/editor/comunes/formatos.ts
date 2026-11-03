import { esPrecio } from '../../nucleo'

// Con useGrouping 'always': es-ES solo agrupa a partir de 10.000 y «1234,50 €» se lee peor en una lista de precios.
const EUROS = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' })

/** «199,00 €». */
export const formatoPrecio = (euros: number): string => EUROS.format(euros)

/** AAAA-MM-DD como dd/mm/aaaa. */
export function formatoFecha(fecha: string): string {
  const [a, m, d] = fecha.split('-')
  return `${d}/${m}/${a}`
}

/** La fecha local de hoy en AAAA-MM-DD (la del día en que el usuario anota el precio, no la de UTC). */
export function hoy(ahora: Date = new Date()): string {
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`
}

/** Un precio tecleado («199,99» o «199.99», sin separador de miles), o null si no lo es. */
export function leerPrecio(texto: string): number | null {
  const limpio = texto.trim()
  if (!/^\d+([.,]\d{1,2})?$/.test(limpio)) return null
  const n = Number(limpio.replace(',', '.'))
  return esPrecio(n) ? n : null
}
