import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import { alNoAutorizado, api, exigir, fijarFuenteDeToken } from '../api/cliente'
import { almacenamientoSeguro } from '../editor/persistencia/local'

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
  cerrarSesion(motivo?: 'caducada'): void
  haySesion(): boolean
}

interface SesionGuardada {
  token: string
  caducidad: string
}

const st = almacenamientoSeguro()

function leerSesion(): SesionGuardada | null {
  if (st === null) return null
  try {
    const crudo = st.getItem(CLAVE_SESION)
    if (crudo === null) return null
    const dato: unknown = JSON.parse(crudo)
    if (typeof dato !== 'object' || dato === null) return null
    const { token, caducidad } = dato as { token?: unknown; caducidad?: unknown }
    return typeof token === 'string' && typeof caducidad === 'string' ? { token, caducidad } : null
  } catch {
    return null
  }
}

function guardarSesion(s: SesionGuardada | null): void {
  if (st === null) return
  try {
    if (s === null) st.removeItem(CLAVE_SESION)
    else st.setItem(CLAVE_SESION, JSON.stringify({ token: s.token, caducidad: s.caducidad }))
  } catch {
    // sin espacio o sin acceso: la sesión dura lo que la pestaña
  }
}

let avisoDeCaducidad: () => void = () => {}

// Lo registra un componente de la app con su navigate (NavegacionDeSesion).
export function alCaducarLaSesion(f: () => void): void {
  avisoDeCaducidad = f
}

function estadoGuardado(): Pick<EstadoSesion, 'token' | 'caducidad' | 'usuario'> {
  const g = leerSesion()
  return { token: g?.token ?? null, caducidad: g?.caducidad ?? null, usuario: null }
}

export const sesion = createStore<EstadoSesion>()((set, get) => {
  const olvidar = () => {
    guardarSesion(null)
    set({ token: null, caducidad: null, usuario: null })
  }

  return {
    ...estadoGuardado(),

    async iniciarSesion(correo, contrasena) {
      // Sin token previo: un 401 por credenciales malas no debe tomarse como sesión caducada.
      olvidar()
      const r = exigir(await api.POST('/sesiones', { body: { correo, contrasena } }))
      guardarSesion(r)
      set({ token: r.token, caducidad: r.caducidad })
      try {
        await get().cargarUsuario()
      } catch (e) {
        olvidar()
        throw e
      }
    },

    async cargarUsuario() {
      const u = exigir(await api.GET('/cuentas/yo'))
      set({ usuario: { nombre: u.nombre, correo: u.correo } })
    },

    cerrarSesion(motivo) {
      const habia = get().token !== null
      olvidar()
      if (motivo === 'caducada' && habia) avisoDeCaducidad()
    },

    haySesion() {
      const { token, caducidad } = get()
      return token !== null && caducidad !== null && Date.parse(caducidad) > Date.now()
    },
  }
})

export function conectarSesionConApi(): void {
  const { haySesion, cerrarSesion } = sesion.getState()
  fijarFuenteDeToken(() => haySesion() ? sesion.getState().token : null)
  alNoAutorizado(() => cerrarSesion('caducada'))
}

// Para las pruebas: vuelve al estado guardado en el navegador.
export function reiniciarSesion(): void {
  avisoDeCaducidad = () => {}
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
