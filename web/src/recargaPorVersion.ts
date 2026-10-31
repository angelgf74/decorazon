// Tras un despliegue, una pestaña abierta con la versión anterior puede pedir un
// fragmento (la vista 3D) cuyo fichero con hash ya no existe. Se recarga una sola
// vez; si vuelve a fallar, el error sigue su curso y lo muestra la vista.
export const CLAVE_RECARGA = 'decorazon.recargaPorVersion'

function leer(): string | null {
  try {
    return sessionStorage.getItem(CLAVE_RECARGA)
  } catch {
    return null
  }
}

function escribir(valor: string | null): void {
  try {
    if (valor === null) sessionStorage.removeItem(CLAVE_RECARGA)
    else sessionStorage.setItem(CLAVE_RECARGA, valor)
  } catch {
    // Sin almacenamiento: como mucho se recargará otra vez.
  }
}

export function conectarRecargaPorVersion(recargar: () => void = () => location.reload()): () => void {
  const alFallar = (evento: Event) => {
    if (leer() !== null) return
    escribir('1')
    evento.preventDefault()
    recargar()
  }
  window.addEventListener('vite:preloadError', alFallar)
  return () => window.removeEventListener('vite:preloadError', alFallar)
}

export function versionCargada(): void {
  escribir(null)
}
