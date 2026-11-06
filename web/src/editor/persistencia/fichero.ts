import { serializarDocumento, validarDocumento, type DocumentoDiseno } from '../../nucleo'
import { descargar, nombreDeFichero } from '../comunes/descargar'

/** Sufijo de los ficheros de diseño: un .json que el sistema abre como texto y que Decorazon reconoce al importar. */
export const EXTENSION = '.decorazon.json'
/** Un diseño pesa como mucho 1 MB en el servidor; un fichero mayor no es un diseño (y no se intenta ni leer). */
const TAMANO_MAXIMO = 2 * 1024 * 1024

/** Descarga el diseño como `<nombre>.decorazon.json`, con el mismo JSON que viaja al servidor. */
export function exportarDiseno(doc: DocumentoDiseno, nombre: string): void {
  descargar(`${nombreDeFichero(nombre)}${EXTENSION}`, new Blob([serializarDocumento(doc)], { type: 'application/json' }))
}

export type ResultadoImportar = { ok: true; documento: DocumentoDiseno; nombre: string } | { ok: false }

/** El nombre del diseño a partir del del fichero: sin `.decorazon.json` o, si no lo lleva, sin `.json`. */
function nombreDelFichero(nombre: string): string {
  const sinSufijo = nombre.endsWith(EXTENSION) ? nombre.slice(0, -EXTENSION.length) : nombre.replace(/\.json$/i, '')
  return sinSufijo.trim()
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
