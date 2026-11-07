import { useSyncExternalStore } from 'react'

/**
 * Instalar Decorazon como app (M-25). Chrome y derivados avisan con `beforeinstallprompt` cuando la PWA se puede instalar:
 * se guarda el evento (anulado, para que el navegador no enseñe su propia barra) y «Instalar Decorazon» lo dispara cuando
 * la persona quiere. Safari en iPhone e iPad no avisa: ahí se enseñan los pasos (Compartir → Añadir a pantalla de inicio).
 * El oyente va en main.tsx antes de que React monte, porque el evento puede llegar antes.
 */

/** 'no': nada que ofrecer (ya instalada o sin aviso); 'aviso': el navegador deja instalar; 'ios': enseñar los pasos. */
export type EstadoDeInstalacion = 'no' | 'aviso' | 'ios'

interface AvisoDeInstalacion extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let aviso: AvisoDeInstalacion | null = null
let instalada = false
const oyentes = new Set<() => void>()

function avisar(): void {
  for (const o of oyentes) o()
}

export function conectarInstalacion(w: Window = window): void {
  w.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    aviso = e as AvisoDeInstalacion
    avisar()
  })
  w.addEventListener('appinstalled', () => {
    aviso = null
    instalada = true
    avisar()
  })
}

/** Ya abierta desde la pantalla de inicio: no tiene sentido ofrecer instalarla. */
function enPantallaDeInicio(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches)
}

/** Safari en iPhone o iPad. Un iPad con iPadOS se presenta como un Mac: se distingue por la pantalla táctil. */
function esIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function estadoDeInstalacion(): EstadoDeInstalacion {
  if (instalada || enPantallaDeInicio()) return 'no'
  if (aviso !== null) return 'aviso'
  return esIos() ? 'ios' : 'no'
}

function suscribir(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => { oyentes.delete(oyente) }
}

export function useEstadoDeInstalacion(): EstadoDeInstalacion {
  return useSyncExternalStore(suscribir, estadoDeInstalacion, () => 'no')
}

/** Enseña el aviso del navegador. Chrome solo deja enseñar cada aviso una vez: se consume, acepte o no. */
export async function instalar(): Promise<boolean> {
  const e = aviso
  if (e === null) return false
  aviso = null
  avisar()
  try {
    await e.prompt()
    const { outcome } = await e.userChoice
    return outcome === 'accepted'
  } catch {
    // Chrome lanza si el aviso ya se enseñó o falta el gesto: no se instala y no se deja una promesa rechazada.
    return false
  }
}

/** Solo para los tests. */
export function reiniciarInstalacion(): void {
  aviso = null
  instalada = false
  oyentes.clear()
}
