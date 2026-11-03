import type { StoreApi } from 'zustand/vanilla'
import { redondearNumeros, validarDocumento, type DocumentoDiseno } from '../../nucleo'
import type { EstadoEditor } from '../estado/almacen'

export const CLAVE_DISENO = 'decorazon.disenoAnonimo'
export const CLAVE_DESCARTADO = 'decorazon.disenoAnonimo.descartado'
export const CLAVE_REGISTRO_ENVIADO = 'decorazon.registroEnviado'
/** Correo de la cuenta dueña de las copias locales de diseños del servidor. */
export const CLAVE_DUENO_COPIAS = 'decorazon.duenoCopias'
/** Id con el que se sube el diseño anónimo: un reintento tras perder la respuesta no crea otro diseño. */
export const CLAVE_ID_DE_SUBIDA = 'decorazon.idDeSubida'

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

/** El documento de un diseño anónimo guardado, o null si no se entiende. */
function documentoGuardado(crudo: string): DocumentoDiseno | null {
  let dato: unknown
  try {
    dato = JSON.parse(crudo)
  } catch {
    return null
  }
  if (typeof dato !== 'object' || dato === null || (dato as { version?: unknown }).version !== 1) return null
  const r = validarDocumento((dato as { documento?: unknown }).documento)
  return r.valido ? r.documento : null
}

export function leerDisenoLocal(st: Storage | null): DocumentoDiseno | null {
  if (st === null) return null
  let crudo: string | null
  try {
    crudo = st.getItem(CLAVE_DISENO)
  } catch {
    return null
  }
  if (crudo === null) return recuperarDescartado(st)
  return documentoGuardado(crudo) ?? descartar(st, crudo)
}

/**
 * Sin diseño anónimo, el que se apartó por no entenderlo vuelve si ahora sí se entiende: una versión anterior de la
 * web (tras volver atrás una release, o una pestaña con la versión vieja) aparta lo que no conoce, como un mueble de
 * tienda. Descartarlo a propósito borra también el apartado (guardarDisenoLocal con null), así que no reaparece.
 */
function recuperarDescartado(st: Storage): DocumentoDiseno | null {
  try {
    const crudo = st.getItem(CLAVE_DESCARTADO)
    const doc = crudo === null ? null : documentoGuardado(crudo)
    if (crudo === null || doc === null) return null
    st.setItem(CLAVE_DISENO, crudo)
    st.removeItem(CLAVE_DESCARTADO)
    return doc
  } catch {
    return null
  }
}

export function guardarDisenoLocal(st: Storage | null, doc: DocumentoDiseno | null): boolean {
  if (st === null) return false
  try {
    if (doc === null) {
      st.removeItem(CLAVE_DISENO)
      st.removeItem(CLAVE_DESCARTADO)
    }
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
  /** El `nombre` es un renombrado que el servidor aún no tiene. Sin el campo (copias antiguas) se deduce del nombre al abrir. */
  nombrePendiente?: boolean
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
    const { version, nombre, nombrePendiente, documento, pendiente } = dato as Record<string, unknown>
    if (typeof version !== 'number' || typeof pendiente !== 'boolean') return null
    const r = validarDocumento(documento)
    if (!r.valido) return null
    // Sin la marca (copias antiguas) queda sin definir: elegirApertura lo deduce del nombre.
    return { version, ...(typeof nombre === 'string' && { nombre }), ...(typeof nombrePendiente === 'boolean' && { nombrePendiente }), documento: r.documento, pendiente }
  } catch {
    return null
  }
}

export function guardarCopiaLocal(st: Storage | null, id: string, copia: CopiaLocal): boolean {
  if (st === null) return false
  try {
    st.setItem(claveCopia(id), JSON.stringify({ ...copia, documento: redondearNumeros(copia.documento), guardadaEn: new Date().toISOString() }))
    return true
  } catch {
    return false
  }
}

export function borrarCopiaLocal(st: Storage | null, id: string): void {
  try {
    st?.removeItem(claveCopia(id))
  } catch {
    // sin acceso: no hay nada que borrar
  }
}

function idsDeCopias(st: Storage): string[] {
  return Array.from({ length: st.length }, (_, i) => st.key(i))
    .filter((k): k is string => k?.startsWith(PREFIJO_COPIA) ?? false)
    .map((k) => k.slice(PREFIJO_COPIA.length))
}

export interface CopiaListada {
  id: string
  nombre?: string
  /** Cuándo se escribió la copia, si se sabe. */
  guardadaEn?: string
  pendiente: boolean
}

function resumenDeCopia(id: string, crudo: string | null): CopiaListada | null {
  if (crudo === null) return null
  try {
    const dato: unknown = JSON.parse(crudo)
    if (typeof dato !== 'object' || dato === null) return null
    const { version, nombre, pendiente, guardadaEn } = dato as Record<string, unknown>
    if (typeof version !== 'number' || typeof pendiente !== 'boolean') return null
    const fecha = typeof guardadaEn === 'string' && !Number.isNaN(Date.parse(guardadaEn)) ? { guardadaEn } : {}
    return { id, ...(typeof nombre === 'string' && { nombre }), ...fecha, pendiente }
  } catch {
    return null
  }
}

/**
 * Las copias locales de diseños del servidor, para listarlas: cada una se parsea una vez y no se valida el documento.
 * La validación completa la hace leerCopiaLocal al abrirla.
 */
export function listarCopiasLocales(st: Storage | null): CopiaListada[] {
  if (st === null) return []
  try {
    return idsDeCopias(st).flatMap((id) => resumenDeCopia(id, st.getItem(claveCopia(id))) ?? [])
  } catch {
    return []
  }
}

/** Borra todas las copias locales de diseños del servidor. */
export function borrarCopiasLocales(st: Storage | null): void {
  if (st === null) return
  try {
    for (const id of idsDeCopias(st)) st.removeItem(claveCopia(id))
  } catch {
    // sin acceso: no hay nada que borrar
  }
}

/** Con cambios sin pausa (un arrastre largo) se escribe igualmente cada tanto: un cierre a mitad no se lo lleva todo. */
export const ESPERA_MAXIMA_COPIA_MS = 2000

/** Cuánto esperar a escribir: `esperaMs` tras el último cambio, pero nunca más allá de `maximoMs` desde el primero sin escribir. */
export function esperaAgrupada(primero: number, ahora: number, esperaMs: number, maximoMs: number): number {
  return Math.max(0, Math.min(esperaMs, primero + maximoMs - ahora))
}

export function conectarPersistencia(a: StoreApi<EstadoEditor>, st: Storage | null, esperaMs = 500): () => void {
  let temporizador: ReturnType<typeof setTimeout> | undefined
  let pendiente = false
  // Cuándo empezó el cambio aún sin escribir.
  let desde: number | null = null
  // El último documento anónimo cambiado: al abrir uno del servidor, el almacén ya tiene otro.
  let ultimo: DocumentoDiseno | null = null

  const guardarYa = () => {
    clearTimeout(temporizador)
    temporizador = undefined
    desde = null
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
    desde ??= Date.now()
    temporizador = setTimeout(guardarYa, esperaAgrupada(desde, Date.now(), esperaMs, ESPERA_MAXIMA_COPIA_MS))
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
