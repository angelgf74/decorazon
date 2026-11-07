// El tracker de WebAnalytics lee el sitio de ?site= (sin él responde 400): data-site-id solo sirve para no cargarlo dos veces.
const URL_TRACKER = 'https://webanalytics-api.angelgf.com.es/tracker.js'

/** Lo que acompaña a un evento: nunca datos personales ni ids de diseño (un tipo del catálogo, el nombre de un ejemplo). */
export type DatosDeEvento = Record<string, string | number | boolean>

declare global {
  interface Window {
    /** Lo define tracker.js de WebAnalytics al cargar. */
    webanalytics?: { evento(nombre: string, datos?: DatosDeEvento): void }
  }
}

/** Eventos que se guardan mientras el script del tracker aún no ha cargado; más de esto se pierde por el principio. */
const COLA_MAXIMA = 20

let activa = false
let pendientes: { nombre: string; datos?: DatosDeEvento }[] = []

export function iniciarAnalitica(sitio: string | undefined = import.meta.env.VITE_ANALITICA_SITIO): void {
  // Los enlaces de correo llevan un token de un solo uso, y los de un diseño compartido lo llevan en la ruta:
  // esas cargas no se miden para no enviarlo a un tercero.
  if (!sitio || new URLSearchParams(location.search).has('token') || location.pathname.startsWith('/compartido/')) return
  if (document.querySelector('script[data-site-id]')) return
  const script = document.createElement('script')
  script.async = true
  script.src = `${URL_TRACKER}?site=${encodeURIComponent(sitio)}`
  script.dataset.siteId = sitio
  script.addEventListener('load', vaciarPendientes)
  // Bloqueado o caído: lo encolado no va a salir, y lo que venga tampoco.
  script.addEventListener('error', () => { activa = false; pendientes = [] })
  activa = true
  document.head.appendChild(script)
}

/** Cuenta algo que pasó (un mueble añadido, la 3D abierta). Sin analítica activa no hace nada; antes de que cargue el tracker, espera. */
export function evento(nombre: string, datos?: DatosDeEvento): void {
  if (typeof window === 'undefined' || !activa) return
  if (window.webanalytics) {
    // Contar nunca rompe a quien cuenta: un tracker que lanza se ignora.
    try {
      if (datos === undefined) window.webanalytics.evento(nombre)
      else window.webanalytics.evento(nombre, datos)
    } catch { /* nada */ }
    return
  }
  pendientes.push(datos === undefined ? { nombre } : { nombre, datos })
  if (pendientes.length > COLA_MAXIMA) pendientes.splice(0, pendientes.length - COLA_MAXIMA)
}

function vaciarPendientes(): void {
  const cola = pendientes
  pendientes = []
  for (const { nombre, datos } of cola) evento(nombre, datos)
}

/** Solo para los tests: olvida que se inició y lo que esperaba. */
export function reiniciarAnalitica(): void {
  activa = false
  pendientes = []
}
