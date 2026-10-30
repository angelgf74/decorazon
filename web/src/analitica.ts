const URL_TRACKER = 'https://angelgf.com.es/webanalyticsapi/tracker.js'

export function iniciarAnalitica(sitio: string | undefined = import.meta.env.VITE_ANALITICA_SITIO): void {
  if (!sitio || document.querySelector('script[data-site-id]')) return
  const script = document.createElement('script')
  script.async = true
  script.src = URL_TRACKER
  script.dataset.siteId = sitio
  document.head.appendChild(script)
}
