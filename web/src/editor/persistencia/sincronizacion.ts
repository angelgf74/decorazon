import type { StoreApi } from 'zustand/vanilla'
import { ErrorDeApi } from '../../api/cliente'
import { mensajeDeError } from '../../cuenta/errores'
import { guardarDiseno, obtenerDiseno, type DisenoServidor } from '../../disenos/servidor'
import type { DocumentoDiseno } from '../../nucleo'
import { textos } from '../../textos'
import type { EstadoEditor, EstadoGuardado } from '../estado/almacen'
import type { Origen } from '../estado/origen'
import { almacenamientoSeguro, borrarCopiaLocal, guardarCopiaLocal, type CopiaLocal } from './local'

export const REINTENTO_MS = 30_000

export type Eleccion = 'recargar' | 'sobrescribir'

export interface Apertura {
  id: string
  version: number
  nombre: string
  documento: DocumentoDiseno
  /** Tiene cambios que el servidor aún no tiene. */
  pendiente: boolean
  /** Renombrado hecho aquí que el servidor aún no tiene. */
  nombrePendiente?: string
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
  const nombreRemoto = remoto.diseno.nombre
  const mismaVersion = copia !== null && copia.version === remoto.version
  const renombrado = mismaVersion && copia.nombre !== undefined && copia.nombre !== nombreRemoto ? copia.nombre : undefined
  if (copia?.pendiente && !mismaVersion) {
    // Nunca se pisa en silencio: con otra versión en el servidor, decide el usuario.
    // Un nombre local distinto queda como renombrado pendiente: "Sobrescribir" lo sube y "Recargar" lo descarta.
    const local = copia.nombre !== undefined && copia.nombre !== nombreRemoto ? copia.nombre : undefined
    return {
      id, version: copia.version, nombre: local ?? nombreRemoto, documento: copia.documento, pendiente: true,
      ...(local !== undefined && { nombrePendiente: local }), guardado: 'conflicto', versionRemota: remoto.version,
    }
  }
  const nombre = renombrado ?? nombreRemoto
  const conRenombrado = renombrado !== undefined ? { nombrePendiente: renombrado } : {}
  if (copia?.pendiente) return { id, version: copia.version, nombre, documento: copia.documento, pendiente: true, ...conRenombrado, guardado: 'pendiente' }
  return {
    id, version: remoto.version, nombre, documento: remoto.diseno.contenido, pendiente: false, ...conRenombrado,
    guardado: renombrado !== undefined ? 'pendiente' : 'guardado',
  }
}

// Guardados en marcha por id, de cualquier almacén: quien vaya a leer la copia local de un diseño espera a que acaben.
const enMarcha = new Map<string, Set<Promise<void>>>()

function registrar(id: string, p: Promise<void>): Promise<void> {
  const conjunto = enMarcha.get(id) ?? new Set()
  enMarcha.set(id, conjunto)
  conjunto.add(p)
  void p.finally(() => {
    conjunto.delete(p)
    if (conjunto.size === 0 && enMarcha.get(id) === conjunto) enMarcha.delete(id)
  })
  return p
}

/** Espera a que terminen los guardados en marcha de ese diseño (también los que encadenen). */
export async function esperarGuardados(id: string): Promise<void> {
  for (let c = enMarcha.get(id); c !== undefined && c.size > 0; c = enMarcha.get(id)) await Promise.allSettled([...c])
}

// Cambia al cerrar la sesión: los trabajos de antes ya no suben nada ni escriben su copia.
let epoca = 0

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
  epoca: number
}

const hayCambios = (t: Trabajo) => t.sucio || t.nombrePendiente !== null
const anulado = (t: Trabajo) => t.epoca !== epoca

interface Controlador {
  abierto(ap: Apertura): void
  resolver(eleccion: Eleccion): Promise<void>
  renombrar(nombre: string): void
  anular(): void
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
  const copiar = (t: Trabajo) => {
    // Un trabajo ya dejado no pisa la copia del mismo diseño abierto otra vez.
    if (anulado(t) || (t !== actual && actual?.id === t.id)) return
    const ok = guardarCopiaLocal(st, t.id, { version: t.version, nombre: t.nombre, documento: t.documento, pendiente: hayCambios(t) })
    if (!ok) fijar(t, { aviso: textos.barra.sinCopiaLocal })
  }

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

  const guardar = (t: Trabajo): Promise<void> => registrar(t.id, enviar(t))

  // Nunca hay dos PUT a la vez del mismo trabajo: lo cambiado durante uno sale al acabar, con la versión nueva.
  async function enviar(t: Trabajo): Promise<void> {
    if (t.enVuelo || t.conflicto || anulado(t)) return
    if (!hayCambios(t)) {
      if (t === actual && a.getState().guardado === 'sinConexion') await comprobar(t)
      return
    }
    const habiaDoc = t.sucio
    const nombre = t.nombrePendiente ?? undefined
    t.enVuelo = true
    t.sucio = false
    t.nombrePendiente = null
    fijar(t, { guardado: 'pendiente' })
    try {
      const r = await guardarDiseno(t.id, t.version, { nombre: t.nombre, doc: t.documento })
      t.enVuelo = false
      t.version = r.version
      if (t.nombrePendiente === null) t.nombre = r.nombre
      copiar(t)
      fijarOrigen(t)
      if (t !== actual) {
        if (hayCambios(t)) void guardar(t)
        return
      }
      pararReintentos()
      if (hayCambios(t)) {
        if (temporizador === undefined) programar(0)
      } else fijar(t, { guardado: 'guardado' })
    } catch (e) {
      t.enVuelo = false
      if (habiaDoc) t.sucio = true
      if (nombre !== undefined) t.nombrePendiente ??= nombre
      if (t !== actual) return
      if (e instanceof ErrorDeApi && e.estado === 0) {
        fijar(t, { guardado: 'sinConexion' })
        iniciarReintentos()
      } else if (e instanceof ErrorDeApi && e.estado === 412) {
        t.conflicto = true
        clearTimeout(temporizador)
        temporizador = undefined
        pararReintentos()
        fijar(t, { guardado: 'conflicto', versionRemota: e.version ?? null })
      } else {
        // También un 401: si cierra la sesión, se sale del editor; la copia local sigue pendiente y se sube al volver.
        // Un 400 explica qué falla (p. ej. más de 1 MB): su mensaje no se pierde.
        fijar(t, { guardado: 'error', ...(e instanceof ErrorDeApi && e.estado === 400 && { aviso: e.mensaje }) })
      }
    }
  }

  // Sin conexión y sin nada que subir: solo el servidor dice si se puede volver a "Guardado".
  async function comprobar(t: Trabajo): Promise<void> {
    t.enVuelo = true
    try {
      const { diseno, version } = await obtenerDiseno(t.id)
      t.enVuelo = false
      if (t !== actual) return
      pararReintentos()
      if (hayCambios(t)) void guardar(t)
      else if (version === t.version) fijar(t, { guardado: 'guardado' })
      // Sin cambios propios no se pierde nada: se trae lo guardado desde otro sitio.
      else abrirDiseno(a, { id: t.id, version, nombre: diseno.nombre, documento: diseno.contenido, pendiente: false, guardado: 'guardado' })
    } catch (e) {
      t.enVuelo = false
      // Solo la falta de red deja seguir en "Sin conexión"; lo demás es un error.
      if (t !== actual || (e instanceof ErrorDeApi && e.estado === 0)) return
      pararReintentos()
      if (e instanceof ErrorDeApi && e.estado === 404) {
        // Ya no existe: sin cambios propios, la copia sobra; con ellos, se ofrecerán al volver a abrirlo.
        if (!hayCambios(t)) borrarCopiaLocal(st, t.id)
        fijar(t, { guardado: 'error', aviso: textos.editorDeDiseno.noExiste })
      } else fijar(t, { guardado: 'error' })
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
    actual = { id, version, nombre, documento: estado.documento, sucio: false, nombrePendiente: null, enVuelo: false, conflicto: false, epoca }
    origenPropio = estado.origen
  }

  const alEditar = (estado: EstadoEditor) => {
    const t = actual
    if (t === null || estado.origen.tipo !== 'servidor' || estado.documento === null) return
    t.documento = estado.documento
    t.sucio = true
    copiar(t)
    if (estado.guardado === 'conflicto') return
    if (estado.guardado === 'sinConexion') {
      iniciarReintentos()
      return
    }
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
  const alSalir = (e: Event) => {
    if (actual !== null && (hayCambios(actual) || a.getState().guardado === 'pendiente')) e.preventDefault()
  }
  globalThis.addEventListener?.('online', alVolverLaRed)
  globalThis.addEventListener?.('beforeunload', alSalir)

  controladores.set(a, {
    abierto(ap) {
      const t = actual
      if (t === null || t.id !== ap.id) return
      t.sucio = ap.pendiente
      t.nombrePendiente = ap.nombrePendiente ?? null
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
        // Sobrescribir pisa el contenido, no un nombre que aquí no se ha cambiado: sin renombrado propio, va el remoto.
        let remota = a.getState().versionRemota
        let nombreRemoto: string | null = null
        if (t.nombrePendiente === null || remota === null) {
          const r = await obtenerDiseno(t.id)
          remota = r.version
          if (t.nombrePendiente === null) nombreRemoto = r.diseno.nombre
        }
        if (t !== actual) return
        t.version = remota
        if (nombreRemoto !== null) t.nombre = nombreRemoto
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

    // Con la época ya cambiada, dejar no sube nada.
    anular: dejar,
  })

  return () => {
    desuscribir()
    dejar()
    globalThis.removeEventListener?.('online', alVolverLaRed)
    globalThis.removeEventListener?.('beforeunload', alSalir)
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

/** Al cerrar la sesión: deja el diseño abierto sin subir lo pendiente y ningún guardado en marcha vuelve a escribir su copia. */
export function anularSincronizacion(a: StoreApi<EstadoEditor>): void {
  epoca++
  controladores.get(a)?.anular()
}

/** Hay algún guardado de un diseño del servidor en marcha. */
export function hayGuardadosEnMarcha(): boolean {
  return enMarcha.size > 0
}
