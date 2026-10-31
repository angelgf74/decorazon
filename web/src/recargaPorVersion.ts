// Tras un despliegue, una pestaña abierta con la versión anterior puede pedir un
// fragmento (la vista 3D) cuyo fichero con hash ya no existe. Se recarga una sola
// vez; si vuelve a fallar enseguida, el error sigue su curso y lo muestra la vista.
// La marca guarda la hora: una de hace más de un minuto es de otro despliegue y no
// cuenta. No hay bucle porque la página recargada abre en 2D y hace falta otro clic.
export const CLAVE_RECARGA = 'decorazon.recargaPorVersion'
const VIGENCIA_DE_LA_MARCA_MS = 60_000

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
    // Sin almacenamiento, cada clic en 3D con el fragmento roto recarga una vez.
  }
}

export function conectarRecargaPorVersion(recargar: () => void = () => location.reload()): () => void {
  const alFallar = (evento: Event) => {
    const marca = Number(leer())
    if (marca > 0 && Date.now() - marca < VIGENCIA_DE_LA_MARCA_MS) return
    escribir(String(Date.now()))
    evento.preventDefault()
    recargar()
  }
  window.addEventListener('vite:preloadError', alFallar)
  return () => window.removeEventListener('vite:preloadError', alFallar)
}

export function versionCargada(): void {
  escribir(null)
}
