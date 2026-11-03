import { sinRecargar } from '../../recargaPorVersion'

type ModuloVista3D = typeof import('./Vista3D')

/** Lo que se espera desde que se abre el editor: que lo primero que se pinte y se toque no compita con la carga. */
export const ESPERA_PRECARGA_MS = 3000
const PLAZO_DEL_NAVEGADOR_LIBRE_MS = 2000

/**
 * Carga en segundo plano el fragmento de la vista 3D (three y la escena, ~1 MB) y entrega el módulo con `alCargar`.
 * Con el componente ya en la mano, pulsar 3D no pasa por Suspense, que en React 19 tarda unos 300 ms en enseñar lo
 * cargado aunque el fichero ya esté en la caché de la PWA. No comprueba WebGL (crear un contexto de prueba también
 * cuesta; Vista3D lo comprueba al montarse). Un fallo se ignora: al pulsar 3D se vuelve a intentar con su aviso.
 * Devuelve cómo cancelarla.
 */
export function precargarVista3D({
  alCargar,
  cargar = () => import('./Vista3D'),
}: { alCargar: (modulo: ModuloVista3D) => void; cargar?: () => Promise<ModuloVista3D> }): () => void {
  let cancelada = false
  let libre: number | undefined
  const empezar = () => {
    sinRecargar(cargar).then((modulo) => {
      if (!cancelada) alCargar(modulo)
    }, () => {})
  }
  const espera = setTimeout(() => {
    if (typeof requestIdleCallback === 'function') libre = requestIdleCallback(empezar, { timeout: PLAZO_DEL_NAVEGADOR_LIBRE_MS })
    else empezar()
  }, ESPERA_PRECARGA_MS)
  return () => {
    cancelada = true
    clearTimeout(espera)
    if (libre !== undefined) cancelIdleCallback(libre)
  }
}
