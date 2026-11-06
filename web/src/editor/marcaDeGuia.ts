/** Marca de que la guía del primer uso ya se enseñó: no vuelve a salir en este navegador. Los e2e la ponen de antemano. */
export const CLAVE_GUIA = 'decorazon.guia'

export function guiaVista(): boolean {
  try {
    return localStorage.getItem(CLAVE_GUIA) === 'vista'
  } catch {
    return false
  }
}

export function marcarGuiaVista(): void {
  try {
    localStorage.setItem(CLAVE_GUIA, 'vista')
  } catch {
    // Sin almacenamiento, la guía saldrá otra vez la próxima vez: nada más.
  }
}
