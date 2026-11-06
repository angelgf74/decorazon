import { serializarDocumento, validarDocumento, type DocumentoDiseno } from '../../nucleo'
import { descargar, nombreDeFichero } from '../comunes/descargar'

/** Sufijo de los ficheros de diseño: un .json que el sistema abre como texto y que Decorazon reconoce al importar. */
export const EXTENSION = '.decorazon.json'
/** Un diseño pesa como mucho 1 MB en el servidor; con margen para el formato, un fichero mayor no es un diseño (no se intenta ni leer). */
const TAMANO_MAXIMO = 2 * 1024 * 1024
/** Lo que admite el servidor como nombre de un diseño. */
const LONGITUD_MAXIMA_NOMBRE = 100

/** Descarga el diseño como `<nombre>.decorazon.json`, con el mismo JSON que viaja al servidor. */
export function exportarDiseno(doc: DocumentoDiseno, nombre: string): void {
  descargar(`${nombreDeFichero(nombre)}${EXTENSION}`, new Blob([serializarDocumento(doc)], { type: 'application/json' }))
}

export type ResultadoImportar = { ok: true; documento: DocumentoDiseno; nombre: string } | { ok: false }

/**
 * El nombre del diseño a partir del del fichero: sin `.decorazon.json` (o solo `.json`), sin el « (1)» que el navegador
 * añade al descargar dos veces, y acotado a lo que admite el servidor (sin partir caracteres).
 */
function nombreDelFichero(nombre: string): string {
  const sinSufijo = nombre.replace(/(\.decorazon)?( ?\(\d+\))?\.json$/i, '').replace(/ ?\(\d+\)$/, '').trim()
  return Array.from(sinSufijo).slice(0, LONGITUD_MAXIMA_NOMBRE).join('')
}

/** Lee un fichero de diseño: ok con el documento validado y el nombre, o no (JSON roto, otro formato, demasiado grande). */
export async function importarDiseno(fichero: File): Promise<ResultadoImportar> {
  if (fichero.size > TAMANO_MAXIMO) return { ok: false }
  let dato: unknown
  try {
    dato = JSON.parse(await fichero.text())
  } catch {
    return { ok: false }
  }
  const r = validarDocumento(dato)
  return r.valido ? { ok: true, documento: r.documento, nombre: nombreDelFichero(fichero.name) } : { ok: false }
}
