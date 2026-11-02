const URL_TRACKER = 'https://angelgf.com.es/webanalyticsapi/tracker.js'

export function iniciarAnalitica(sitio: string | undefined = import.meta.env.VITE_ANALITICA_SITIO): void {
  // Los enlaces de correo llevan un token de un solo uso, y los de un diseño compartido lo llevan en la ruta:
  // esas cargas no se miden para no enviarlo a un tercero.
  if (!sitio || new URLSearchParams(location.search).has('token') || location.pathname.startsWith('/compartido/')) return
  if (document.querySelector('script[data-site-id]')) return
  const script = document.createElement('script')
  script.async = true
  script.src = URL_TRACKER
  script.dataset.siteId = sitio
  document.head.appendChild(script)
}
