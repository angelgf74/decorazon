import { useSyncExternalStore } from 'react'
import type { DocumentoDiseno } from '../../nucleo'

export interface VistaPendiente { id: string; doc: DocumentoDiseno }

/**
 * Lo que queda por hacer cuando se sale de un editor con un guardado que aún esperaba su turno: el anfitrión (fuera de
 * la ruta, en App) hace esas imágenes una a una. De un mismo diseño solo cuenta lo último, salvo la que ya está en marcha.
 */
let cola: VistaPendiente[] = []
const oyentes = new Set<() => void>()

const avisar = () => { for (const o of oyentes) o() }

export function encolarVistaPrevia(id: string, doc: DocumentoDiseno): void {
  const enMarcha = cola[0]
  cola = [...cola.filter((v, i) => i === 0 || v.id !== id), { id, doc }]
  if (enMarcha && cola[0] !== enMarcha) cola.unshift(enMarcha)
  avisar()
}

export function quitarVistaPendiente(v: VistaPendiente): void {
  cola = cola.filter((x) => x !== v)
  avisar()
}

const suscribir = (o: () => void) => {
  oyentes.add(o)
  return () => { oyentes.delete(o) }
}
const primera = () => cola[0] ?? null

/** La siguiente imagen por hacer, o null. */
export function useVistaPendiente(): VistaPendiente | null {
  return useSyncExternalStore(suscribir, primera, primera)
}

/** Para los tests. */
export function vaciarColaDeVistasPrevias(): void {
  cola = []
  avisar()
}
