import type { StoreApi } from 'zustand/vanilla'
import { redondearNumeros, validarDocumento, type DocumentoDiseno } from '../../nucleo'
import type { EstadoEditor } from '../estado/almacen'

export const CLAVE_DISENO = 'decorazon.disenoAnonimo'
export const CLAVE_DESCARTADO = 'decorazon.disenoAnonimo.descartado'
export const CLAVE_REGISTRO_ENVIADO = 'decorazon.registroEnviado'
/** Correo de la cuenta dueña de las copias locales de diseños del servidor. */
export const CLAVE_DUENO_COPIAS = 'decorazon.duenoCopias'

/** Un diseño con algo dentro: no basta con la estancia vacía. */
export function disenoNoVacio(doc: DocumentoDiseno | null): doc is DocumentoDiseno {
  return doc !== null && doc.elementos.length + doc.aberturas.length + doc.estructura.length > 0
}

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

/** Guarda el diseño anónimo; con un diseño del servidor abierto no toca su clave. */
export const PREFIJO_COPIA = 'decorazon.diseno.'
export const claveCopia = (id: string) => `${PREFIJO_COPIA}${id}`

/** Copia local de un diseño del servidor; `pendiente` si tiene cambios que el servidor aún no tiene. */
export interface CopiaLocal {
  version: number
  nombre?: string
  documento: DocumentoDiseno
  pendiente: boolean
}

export function leerCopiaLocal(st: Storage | null, id: string): CopiaLocal | null {
  if (st === null) return null
  try {
    const crudo = st.getItem(claveCopia(id))
    if (crudo === null) return null
    const dato: unknown = JSON.parse(crudo)
    if (typeof dato !== 'object' || dato === null) return null
    const { version, nombre, documento, pendiente } = dato as Record<string, unknown>
    if (typeof version !== 'number' || typeof pendiente !== 'boolean') return null
    const r = validarDocumento(documento)
    if (!r.valido) return null
    return { version, ...(typeof nombre === 'string' && { nombre }), documento: r.documento, pendiente }
  } catch {
    return null
  }
}

export function guardarCopiaLocal(st: Storage | null, id: string, copia: CopiaLocal): boolean {
  if (st === null) return false
  try {
    st.setItem(claveCopia(id), JSON.stringify({ ...copia, documento: redondearNumeros(copia.documento) }))
    return true
  } catch {
    return false
  }
}

/** Borra todas las copias locales de diseños del servidor. */
export function borrarCopiasLocales(st: Storage | null): void {
  if (st === null) return
  try {
    const claves = Array.from({ length: st.length }, (_, i) => st.key(i)).filter((k): k is string => k?.startsWith(PREFIJO_COPIA) ?? false)
    for (const k of claves) st.removeItem(k)
  } catch {
    // sin acceso: no hay nada que borrar
  }
}

export function conectarPersistencia(a: StoreApi<EstadoEditor>, st: Storage | null, esperaMs = 500): () => void {
  let temporizador: ReturnType<typeof setTimeout> | undefined
  let pendiente = false
  // El último documento anónimo cambiado: al abrir uno del servidor, el almacén ya tiene otro.
  let ultimo: DocumentoDiseno | null = null

  const guardarYa = () => {
    clearTimeout(temporizador)
    temporizador = undefined
    if (!pendiente) return
    pendiente = false
    const ok = guardarDisenoLocal(st, ultimo)
    if (a.getState().origen.tipo === 'anonimo') a.getState().marcarGuardado(ok ? 'guardado' : 'error')
  }

  if (st === null) a.getState().marcarGuardado('error')

  const desuscribir = a.subscribe((estado, previo) => {
    if (estado.origen.tipo !== 'anonimo') {
      if (previo.origen.tipo === 'anonimo') guardarYa()
      return
    }
    // Volver al anónimo carga lo que ya estaba guardado: no es un cambio.
    if (estado.origen !== previo.origen || estado.documento === previo.documento) return
    pendiente = true
    ultimo = estado.documento
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
