import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import { alNoAutorizado, api, exigir, fijarFuenteDeToken } from '../api/cliente'
import { almacenamientoSeguro } from '../editor/persistencia/local'
import { fijarDuenoDeCopias, olvidarDisenosLocales, soltarDisenosDeLaSesion } from './disenosLocales'

export const CLAVE_SESION = 'decorazon.sesion'

export interface Usuario {
  nombre: string
  correo: string
}

export interface EstadoSesion {
  token: string | null
  caducidad: string | null
  usuario: Usuario | null
  iniciarSesion(correo: string, contrasena: string): Promise<void>
  cargarUsuario(): Promise<void>
  cerrarSesion(motivo?: 'caducada' | { conservarLocales: true }): void
  haySesion(): boolean
}

interface SesionGuardada {
  token: string
  caducidad: string
  /** De quién es: otra pestaña que ve otro token del mismo correo lo adopta en vez de cerrar. */
  correo?: string
}

const st = almacenamientoSeguro()

function leerSesion(): SesionGuardada | null {
  if (st === null) return null
  try {
    return interpretarSesion(st.getItem(CLAVE_SESION))
  } catch {
    return null
  }
}

function interpretarSesion(crudo: string | null): SesionGuardada | null {
  if (crudo === null) return null
  try {
    const dato: unknown = JSON.parse(crudo)
    if (typeof dato !== 'object' || dato === null) return null
    const { token, caducidad, correo } = dato as { token?: unknown; caducidad?: unknown; correo?: unknown }
    if (typeof token !== 'string' || typeof caducidad !== 'string') return null
    return typeof correo === 'string' ? { token, caducidad, correo } : { token, caducidad }
  } catch {
    return null
  }
}

function guardarSesion(s: SesionGuardada | null): void {
  if (st === null) return
  try {
    if (s === null) st.removeItem(CLAVE_SESION)
    else st.setItem(CLAVE_SESION, JSON.stringify({ token: s.token, caducidad: s.caducidad, correo: s.correo }))
  } catch {
    // sin espacio o sin acceso: la sesión dura lo que la pestaña
  }
}

let avisoDeCaducidad: () => void = () => {}
let avisoDeSalida: () => void = () => {}

// Los registra un componente de la app con su navigate (NavegacionDeSesion).
export function alCaducarLaSesion(f: () => void): void {
  avisoDeCaducidad = f
}

export function alSalirDeLaSesion(f: () => void): void {
  avisoDeSalida = f
}

// El correo de la sesión de esta pestaña, aunque el usuario aún no se haya cargado.
let correoDeLaSesion: string | null = null

function estadoGuardado(): Pick<EstadoSesion, 'token' | 'caducidad' | 'usuario'> {
  const g = leerSesion()
  correoDeLaSesion = g?.correo ?? null
  return { token: g?.token ?? null, caducidad: g?.caducidad ?? null, usuario: null }
}

export const sesion = createStore<EstadoSesion>()((set, get) => {
  // Solo esta pestaña: la sesión guardada es compartida y las demás reaccionan a cada cambio.
  const olvidarEnMemoria = () => {
    correoDeLaSesion = null
    set({ token: null, caducidad: null, usuario: null })
  }
  const olvidar = () => {
    guardarSesion(null)
    olvidarEnMemoria()
  }

  return {
    ...estadoGuardado(),

    async iniciarSesion(correo, contrasena) {
      // Sin token previo: un 401 por credenciales malas no debe tomarse como sesión caducada.
      // La guardada no se toca hasta tener la nueva: las otras pestañas de la misma cuenta siguen abiertas.
      olvidarEnMemoria()
      const r = exigir(await api.POST('/sesiones', { body: { correo, contrasena } }))
      set({ token: r.token, caducidad: r.caducidad })
      try {
        await get().cargarUsuario()
      } catch (e) {
        olvidarEnMemoria()
        throw e
      }
      const usuario = get().usuario
      if (usuario === null) return
      guardarSesion({ token: r.token, caducidad: r.caducidad, correo: usuario.correo })
      fijarDuenoDeCopias(usuario.correo)
    },

    async cargarUsuario() {
      const u = exigir(await api.GET('/cuentas/yo'))
      correoDeLaSesion = u.correo
      set({ usuario: { nombre: u.nombre, correo: u.correo } })
    },

    cerrarSesion(motivo) {
      const habia = get().token !== null
      if (motivo === 'caducada') {
        // Las copias locales se quedan: el diseño abierto conserva lo que no llegó a subir.
        olvidar()
        if (habia) avisoDeCaducidad()
        return
      }
      if (typeof motivo === 'object') {
        // Mismo usuario: las copias y el anónimo se quedan; quien llama navega.
        olvidar()
        return
      }
      olvidarDisenosLocales()
      olvidar()
      avisoDeSalida()
    },

    haySesion() {
      const { token, caducidad } = get()
      return token !== null && caducidad !== null && Date.parse(caducidad) > Date.now()
    },
  }
})

export function conectarSesionConApi(): void {
  const { haySesion, cerrarSesion } = sesion.getState()
  fijarFuenteDeToken(() => {
    if (haySesion()) return sesion.getState().token
    // Caducada por tiempo: la API no llegará a dar 401 porque ya no se envía el token.
    if (sesion.getState().token !== null) queueMicrotask(() => cerrarSesion('caducada'))
    return null
  })
  // Un 401 de una petición con un token anterior no cierra la sesión vigente.
  alNoAutorizado((tokenEnviado) => {
    if (tokenEnviado === sesion.getState().token) cerrarSesion('caducada')
  })
}

/**
 * Otra pestaña cerró la sesión o entró con otra cuenta: esta la olvida, vuelve al anónimo y va al inicio.
 * Si entró con la misma cuenta, esta adopta el token nuevo y sigue donde estaba.
 * No borra nada del almacenamiento compartido: ya lo hizo la otra pestaña, y si entró otra cuenta, sus datos son suyos.
 */
export function conectarSesionEntrePestanas(): () => void {
  const alCambiar = (e: StorageEvent) => {
    if (e.key !== null && e.key !== CLAVE_SESION) return
    const propio = sesion.getState().token
    if (propio === null) return
    const otra = e.key === null ? leerSesion() : interpretarSesion(e.newValue)
    if (otra?.token === propio) return
    const correo = sesion.getState().usuario?.correo ?? correoDeLaSesion
    if (otra?.correo !== undefined && correo !== null && otra.correo === correo) {
      sesion.setState({ token: otra.token, caducidad: otra.caducidad })
      return
    }
    soltarDisenosDeLaSesion()
    correoDeLaSesion = null
    sesion.setState({ token: null, caducidad: null, usuario: null })
    avisoDeSalida()
  }
  globalThis.addEventListener?.('storage', alCambiar)
  return () => globalThis.removeEventListener?.('storage', alCambiar)
}

/**
 * Carga el nombre del usuario al arrancar con sesión y, si falló (sin red), lo reintenta cada vez que vuelve la conexión.
 * Los errores se ignoran: la sesión sigue valiendo y el 401 ya lo gestiona la API.
 */
export function conectarCargaDeUsuario(): () => void {
  let cargando = false
  const intentar = () => {
    const { haySesion, usuario, cargarUsuario } = sesion.getState()
    if (cargando || !haySesion() || usuario !== null) return
    cargando = true
    cargarUsuario()
      .catch(() => {})
      .finally(() => {
        cargando = false
      })
  }
  intentar()
  globalThis.addEventListener?.('online', intentar)
  return () => globalThis.removeEventListener?.('online', intentar)
}

// Para las pruebas: vuelve al estado guardado en el navegador.
export function reiniciarSesion(): void {
  avisoDeCaducidad = () => {}
  avisoDeSalida = () => {}
  sesion.setState(estadoGuardado())
}

export function useSesion<T>(selector: (s: EstadoSesion) => T): T {
  return useStore(sesion, selector)
}

// Solo rutas de esta web: "/algo", nunca "//otro.sitio" ni "/\otro.sitio" ni con caracteres de control.
export function rutaInterna(ruta: string | null): string | null {
  if (ruta === null || !ruta.startsWith('/') || ruta.startsWith('//')) return null
  return [...ruta].some((c) => c === '\\' || c < ' ' || c === '\u007f') ? null : ruta
}
