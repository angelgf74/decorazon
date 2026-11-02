import { almacenamientoSeguro } from '../../editor/persistencia/local'

/** Lo que se espera entre dos vistas previas del mismo diseño: guardar a menudo no rehace la imagen cada vez. */
export const ESPERA_ENTRE_VISTAS_MS = 5 * 60_000

const PREFIJO = 'decorazon.vistaPrevia.'

/** Respaldo en memoria: sin almacenamiento (lleno, bloqueado o privado) la espera se sigue respetando. */
const enMemoria = new Map<string, number>()

function ultima(id: string): number {
  let guardada = 0
  try {
    guardada = Number(almacenamientoSeguro()?.getItem(PREFIJO + id)) || 0
  } catch {
    // sin acceso: solo cuenta la memoria
  }
  return Math.max(guardada, enMemoria.get(id) ?? 0)
}

/** Lo que falta para poder rehacer la vista previa del diseño; 0 si ya toca (o nunca se hizo). */
export function msHastaRehacer(id: string, ahora = Date.now()): number {
  const u = ultima(id)
  return u > 0 ? Math.max(0, u + ESPERA_ENTRE_VISTAS_MS - ahora) : 0
}

export function tocaRehacer(id: string, ahora = Date.now()): boolean {
  return msHastaRehacer(id, ahora) === 0
}

export function apuntarVistaPrevia(id: string, ahora = Date.now()): void {
  enMemoria.set(id, ahora)
  try {
    almacenamientoSeguro()?.setItem(PREFIJO + id, String(ahora))
  } catch {
    // Sin almacenamiento: queda la memoria.
  }
}

/** Para los tests: olvida lo apuntado en memoria. */
export function olvidarVistasPreviasEnMemoria(): void {
  enMemoria.clear()
}
