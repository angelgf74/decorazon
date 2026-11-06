/** Caracteres que Windows no admite en un nombre de fichero (los demás sistemas, menos). */
const NO_ADMITIDOS = /[\\/:*?"<>|]/g
const LONGITUD_MAXIMA = 100
const SIN_NOMBRE = 'diseno'

/** Nombre de fichero a partir del nombre de un diseño: sin lo que un sistema de ficheros no admite, sin espacios sobrantes, acotado. */
export function nombreDeFichero(nombre: string): string {
  const limpio = Array.from(nombre.replace(NO_ADMITIDOS, '-').replace(/\s+/g, ' ').trim()).slice(0, LONGITUD_MAXIMA).join('')
  return limpio === '' ? SIN_NOMBRE : limpio
}

/** Cuánto se espera para soltar la URL del objeto: el navegador tiene que haber empezado la descarga. */
const ESPERA_REVOCAR_MS = 1000

/** Descarga `contenido` (un Blob o una URL de datos) con `nombre`: un `<a download>` que se pulsa y se quita. */
export function descargar(nombre: string, contenido: Blob | string): void {
  const url = typeof contenido === 'string' ? contenido : URL.createObjectURL(contenido)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  enlace.rel = 'noopener'
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  if (typeof contenido !== 'string') setTimeout(() => URL.revokeObjectURL(url), ESPERA_REVOCAR_MS)
}
