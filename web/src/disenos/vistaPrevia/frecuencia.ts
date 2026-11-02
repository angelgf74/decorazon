import { almacenamientoSeguro } from '../../editor/persistencia/local'

/** Lo que se espera entre dos vistas previas del mismo diseño: guardar a menudo no rehace la imagen cada vez. */
export const ESPERA_ENTRE_VISTAS_MS = 5 * 60_000

const PREFIJO = 'decorazon.vistaPrevia.'

/** Si toca rehacer la vista previa del diseño: nunca se hizo en este navegador, o hace más de 5 minutos. */
export function tocaRehacer(id: string, ahora = Date.now()): boolean {
  try {
    const ultima = Number(almacenamientoSeguro()?.getItem(PREFIJO + id))
    return !(ultima > 0) || ahora - ultima >= ESPERA_ENTRE_VISTAS_MS
  } catch {
    return true
  }
}

export function apuntarVistaPrevia(id: string, ahora = Date.now()): void {
  try {
    almacenamientoSeguro()?.setItem(PREFIJO + id, String(ahora))
  } catch {
    // Sin almacenamiento: se rehará en el próximo guardado; no pasa nada.
  }
}
