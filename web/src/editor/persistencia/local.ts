import type { StoreApi } from 'zustand/vanilla'
import { redondearNumeros, validarDocumento, type DocumentoDiseno } from '../../nucleo'
import type { EstadoEditor } from '../estado/almacen'

export const CLAVE_DISENO = 'decorazon.disenoAnonimo'
export const CLAVE_DESCARTADO = 'decorazon.disenoAnonimo.descartado'

export function almacenamientoSeguro(): Storage | null {
  try {
    const st = globalThis.localStorage
    const clave = 'decorazon.prueba'
    st.setItem(clave, '1')
    st.removeItem(clave)
    return st
  } catch {
    return null
  }
}

function descartar(st: Storage, crudo: string): null {
  try {
    st.setItem(CLAVE_DESCARTADO, crudo)
    st.removeItem(CLAVE_DISENO)
  } catch {
    // sin espacio o sin acceso: se abre vacío igualmente
  }
  return null
}

export function leerDisenoLocal(st: Storage | null): DocumentoDiseno | null {
  if (st === null) return null
  let crudo: string | null
  try {
    crudo = st.getItem(CLAVE_DISENO)
  } catch {
    return null
  }
  if (crudo === null) return null
  let dato: unknown
  try {
    dato = JSON.parse(crudo)
  } catch {
    return descartar(st, crudo)
  }
  if (typeof dato !== 'object' || dato === null || (dato as { version?: unknown }).version !== 1) return descartar(st, crudo)
  const r = validarDocumento((dato as { documento?: unknown }).documento)
  return r.valido ? r.documento : descartar(st, crudo)
}

export function guardarDisenoLocal(st: Storage | null, doc: DocumentoDiseno | null): boolean {
  if (st === null) return false
  try {
    if (doc === null) st.removeItem(CLAVE_DISENO)
    else st.setItem(CLAVE_DISENO, JSON.stringify({ version: 1, guardadoEn: new Date().toISOString(), documento: redondearNumeros(doc) }))
    return true
  } catch {
    return false
  }
}

export function conectarPersistencia(a: StoreApi<EstadoEditor>, st: Storage | null, esperaMs = 500): () => void {
  let temporizador: ReturnType<typeof setTimeout> | undefined
  let pendiente = false

  const guardarYa = () => {
    clearTimeout(temporizador)
    temporizador = undefined
    if (!pendiente) return
    pendiente = false
    a.getState().marcarGuardado(guardarDisenoLocal(st, a.getState().documento) ? 'guardado' : 'error')
  }

  if (st === null) a.getState().marcarGuardado('error')

  const desuscribir = a.subscribe((estado, previo) => {
    if (estado.documento === previo.documento) return
    pendiente = true
    a.getState().marcarGuardado('pendiente')
    clearTimeout(temporizador)
    temporizador = setTimeout(guardarYa, esperaMs)
  })

  const alOcultar = () => {
    if (globalThis.document?.visibilityState === 'hidden') guardarYa()
  }
  globalThis.addEventListener?.('pagehide', guardarYa)
  globalThis.document?.addEventListener('visibilitychange', alOcultar)

  return () => {
    desuscribir()
    guardarYa()
    globalThis.removeEventListener?.('pagehide', guardarYa)
    globalThis.document?.removeEventListener('visibilitychange', alOcultar)
  }
}
