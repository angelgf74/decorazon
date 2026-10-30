import type { StoreApi } from 'zustand/vanilla'
import { ErrorDeApi } from '../../api/cliente'
import { mensajeDeError } from '../../cuenta/errores'
import { guardarDiseno, obtenerDiseno, type DisenoServidor } from '../../disenos/servidor'
import type { DocumentoDiseno } from '../../nucleo'
import { textos } from '../../textos'
import type { EstadoEditor, EstadoGuardado } from '../estado/almacen'
import type { Origen } from '../estado/origen'
import { almacenamientoSeguro, guardarCopiaLocal, type CopiaLocal } from './local'

export const REINTENTO_MS = 30_000

export type Eleccion = 'recargar' | 'sobrescribir'

export interface Apertura {
  id: string
  version: number
  nombre: string
  documento: DocumentoDiseno
  /** Tiene cambios que el servidor aún no tiene. */
  pendiente: boolean
  guardado: Extract<EstadoGuardado, 'guardado' | 'pendiente' | 'sinConexion' | 'conflicto'>
  versionRemota?: number
}

/** Qué abrir al entrar en un diseño: la copia local si tiene cambios sin subir; si no, la del servidor. `remoto` null = sin conexión. */
export function elegirApertura(
  id: string,
  copia: CopiaLocal | null,
  remoto: { diseno: DisenoServidor; version: number } | null,
): Apertura | null {
  if (remoto === null) {
    if (copia === null) return null
    const nombre = copia.nombre ?? textos.disenos.nombrePorDefecto
    return { id, version: copia.version, nombre, documento: copia.documento, pendiente: copia.pendiente, guardado: 'sinConexion' }
  }
  const nombre = remoto.diseno.nombre
  if (copia?.pendiente) {
    if (copia.version === remoto.version) return { id, version: copia.version, nombre, documento: copia.documento, pendiente: true, guardado: 'pendiente' }
    // Nunca se pisa en silencio: con otra versión en el servidor, decide el usuario.
    return {
      id, version: copia.version, nombre, documento: copia.documento, pendiente: true, guardado: 'conflicto', versionRemota: remoto.version,
    }
  }
  return { id, version: remoto.version, nombre, documento: remoto.diseno.contenido, pendiente: false, guardado: 'guardado' }
}

/** Un diseño del servidor abierto en el editor; sigue vivo tras cerrarlo hasta subir lo que le quede. */
interface Trabajo {
  id: string
  version: number
  nombre: string
  documento: DocumentoDiseno
  sucio: boolean
  nombrePendiente: string | null
  enVuelo: boolean
  conflicto: boolean
}

interface Controlador {
  abierto(ap: Apertura): void
  resolver(eleccion: Eleccion): Promise<void>
  renombrar(nombre: string): void
}

const controladores = new WeakMap<StoreApi<EstadoEditor>, Controlador>()

export function conectarSincronizacion(
  a: StoreApi<EstadoEditor>,
  opciones: { esperaMs: number; st: Storage | null } = { esperaMs: 2000, st: almacenamientoSeguro() },
): () => void {
  const { esperaMs, st } = opciones
  let actual: Trabajo | null = null
  // El último origen que fijó esta sincronización: distingue sus cambios de versión de una apertura.
  let origenPropio: Origen | null = null
  let temporizador: ReturnType<typeof setTimeout> | undefined
  let reintentos: ReturnType<typeof setInterval> | undefined

  const fijar = (t: Trabajo, cambios: Partial<EstadoEditor>) => {
    if (t === actual) a.setState(cambios)
  }
  const fijarOrigen = (t: Trabajo) => {
    if (t !== actual) return
    origenPropio = { tipo: 'servidor', id: t.id, version: t.version, nombre: t.nombre }
    a.setState({ origen: origenPropio })
  }
  const copiar = (t: Trabajo) =>
    guardarCopiaLocal(st, t.id, { version: t.version, nombre: t.nombre, documento: t.documento, pendiente: t.sucio || t.nombrePendiente !== null })

  const programar = (ms: number) => {
    clearTimeout(temporizador)
    temporizador = setTimeout(() => {
      temporizador = undefined
      if (actual !== null) void guardar(actual)
    }, ms)
  }
  const pararReintentos = () => {
    clearInterval(reintentos)
    reintentos = undefined
  }
  const iniciarReintentos = () => {
    reintentos ??= setInterval(() => {
      if (actual !== null) void guardar(actual)
    }, REINTENTO_MS)
  }

  // Nunca hay dos PUT a la vez del mismo trabajo: lo cambiado durante uno sale al acabar, con la versión nueva.
  async function guardar(t: Trabajo): Promise<void> {
    if (t.enVuelo || t.conflicto) return
    if (!t.sucio && t.nombrePendiente === null) {
      if (t === actual && a.getState().guardado === 'sinConexion') {
        pararReintentos()
        fijar(t, { guardado: 'guardado' })
      }
      return
    }
    const doc = t.sucio ? t.documento : undefined
    const nombre = t.nombrePendiente ?? undefined
    t.enVuelo = true
    t.sucio = false
    t.nombrePendiente = null
    fijar(t, { guardado: 'pendiente' })
    try {
      const r = await guardarDiseno(t.id, t.version, { ...(nombre !== undefined && { nombre }), ...(doc !== undefined && { doc }) })
      t.enVuelo = false
      t.version = r.version
      if (t.nombrePendiente === null) t.nombre = r.nombre
      copiar(t)
      fijarOrigen(t)
      if (t !== actual) {
        if (t.sucio || t.nombrePendiente !== null) void guardar(t)
        return
      }
      pararReintentos()
      if (t.sucio || t.nombrePendiente !== null) {
        if (temporizador === undefined) programar(0)
      } else fijar(t, { guardado: 'guardado' })
    } catch (e) {
      t.enVuelo = false
      if (doc !== undefined) t.sucio = true
      if (nombre !== undefined) t.nombrePendiente ??= nombre
      if (t !== actual) return
      if (!(e instanceof ErrorDeApi)) fijar(t, { guardado: 'error' })
      else if (e.estado === 0) {
        fijar(t, { guardado: 'sinConexion' })
        iniciarReintentos()
      } else if (e.estado === 412) {
        t.conflicto = true
        clearTimeout(temporizador)
        temporizador = undefined
        pararReintentos()
        fijar(t, { guardado: 'conflicto', versionRemota: e.version ?? null })
      } else if (e.estado !== 401) fijar(t, { guardado: 'error' })
      // Un 401 lo resuelve la sesión; la copia local sigue pendiente.
    }
  }

  const dejar = () => {
    clearTimeout(temporizador)
    temporizador = undefined
    pararReintentos()
    const t = actual
    actual = null
    origenPropio = null
    // Lo que quedaba por subir sale ya, sin esperar; si falla, la copia local sigue pendiente.
    if (t !== null) void guardar(t)
  }

  const alCambiarDeOrigen = (estado: EstadoEditor) => {
    dejar()
    if (estado.origen.tipo !== 'servidor' || estado.documento === null) return
    const { id, version, nombre } = estado.origen
    actual = { id, version, nombre, documento: estado.documento, sucio: false, nombrePendiente: null, enVuelo: false, conflicto: false }
    origenPropio = estado.origen
  }

  const alEditar = (estado: EstadoEditor) => {
    const t = actual
    if (t === null || estado.origen.tipo !== 'servidor' || estado.documento === null) return
    t.documento = estado.documento
    t.sucio = true
    copiar(t)
    if (estado.guardado === 'conflicto' || estado.guardado === 'sinConexion') return
    if (estado.guardado !== 'pendiente') a.getState().marcarGuardado('pendiente')
    programar(esperaMs)
  }

  const desuscribir = a.subscribe((estado, previo) => {
    if (estado.origen !== previo.origen && estado.origen !== origenPropio) alCambiarDeOrigen(estado)
    else if (estado.documento !== previo.documento) alEditar(estado)
  })

  const alVolverLaRed = () => {
    if (actual !== null && a.getState().guardado === 'sinConexion') void guardar(actual)
  }
  globalThis.addEventListener?.('online', alVolverLaRed)

  controladores.set(a, {
    abierto(ap) {
      const t = actual
      if (t === null || t.id !== ap.id) return
      t.sucio = ap.pendiente
      t.conflicto = ap.guardado === 'conflicto'
      a.setState({ guardado: ap.guardado, versionRemota: ap.versionRemota ?? null })
      copiar(t)
      if (ap.guardado === 'pendiente') programar(esperaMs)
      else if (ap.guardado === 'sinConexion') iniciarReintentos()
    },

    async resolver(eleccion) {
      const t = actual
      if (t === null || !t.conflicto) return
      try {
        if (eleccion === 'recargar') {
          const { diseno, version } = await obtenerDiseno(t.id)
          if (t !== actual) return
          abrirDiseno(a, { id: t.id, version, nombre: diseno.nombre, documento: diseno.contenido, pendiente: false, guardado: 'guardado' })
          return
        }
        const remota = a.getState().versionRemota ?? (await obtenerDiseno(t.id)).version
        if (t !== actual) return
        t.version = remota
        t.conflicto = false
        t.sucio = true
        fijarOrigen(t)
        fijar(t, { versionRemota: null })
        copiar(t)
        await guardar(t)
      } catch (e) {
        fijar(t, { aviso: mensajeDeError(e) })
      }
    },

    renombrar(nombre) {
      const t = actual
      const limpio = nombre.trim()
      if (t === null || limpio === '' || limpio === t.nombre) return
      t.nombre = limpio
      t.nombrePendiente = limpio
      fijarOrigen(t)
      copiar(t)
      const g = a.getState().guardado
      if (t.conflicto || g === 'sinConexion') return
      fijar(t, { guardado: 'pendiente' })
      programar(0)
    },
  })

  return () => {
    desuscribir()
    dejar()
    globalThis.removeEventListener?.('online', alVolverLaRed)
    controladores.delete(a)
  }
}

/** Abre un diseño del servidor con su situación de guardado (copia local pendiente, sin conexión o en conflicto). */
export function abrirDiseno(a: StoreApi<EstadoEditor>, ap: Apertura): void {
  a.getState().abrirDelServidor(ap.id, ap.version, ap.nombre, ap.documento)
  const c = controladores.get(a)
  if (c !== undefined) c.abierto(ap)
  else a.setState({ guardado: ap.guardado, versionRemota: ap.versionRemota ?? null })
}

export function resolverConflicto(a: StoreApi<EstadoEditor>, eleccion: Eleccion): Promise<void> {
  return controladores.get(a)?.resolver(eleccion) ?? Promise.resolve()
}

export function renombrar(a: StoreApi<EstadoEditor>, nombre: string): void {
  controladores.get(a)?.renombrar(nombre)
}
