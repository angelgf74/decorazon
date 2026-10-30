import createClient, { type Middleware } from 'openapi-fetch'
import { textos } from '../textos'
import type { paths } from './esquema'

export class ErrorDeApi extends Error {
  estado: number
  mensaje: string
  version?: number

  constructor(estado: number, mensaje: string, version?: number) {
    super(mensaje)
    this.name = 'ErrorDeApi'
    this.estado = estado
    this.mensaje = mensaje
    this.version = version
  }
}

function textoPorEstado(estado: number): string {
  if (estado === 0) return textos.api.sinRed
  if (estado === 401) return textos.api.sesionCaducada
  if (estado === 404) return textos.api.noExiste
  if (estado === 409) return textos.api.limiteDeDisenos
  if (estado === 429) return textos.api.demasiadosIntentos
  if (estado >= 500) return textos.api.servicioCaido
  return textos.api.inesperado
}

let fuenteDeToken: () => string | null = () => null
let avisoDeNoAutorizado: (tokenEnviado: string) => void = () => {}

export function fijarFuenteDeToken(f: () => string | null): void {
  fuenteDeToken = f
}

// Recibe el token que llevaba la petición rechazada, para no cerrar una sesión más nueva.
export function alNoAutorizado(f: (tokenEnviado: string) => void): void {
  avisoDeNoAutorizado = f
}

const PREFIJO_BEARER = 'Bearer '

const middleware: Middleware = {
  onRequest({ request }) {
    const token = fuenteDeToken()
    if (token) request.headers.set('Authorization', `${PREFIJO_BEARER}${token}`)
    return request
  },
  onResponse({ request, response }) {
    const cabecera = request.headers.get('Authorization')
    if (response.status === 401 && cabecera?.startsWith(PREFIJO_BEARER)) avisoDeNoAutorizado(cabecera.slice(PREFIJO_BEARER.length))
  },
  onError({ error }) {
    if (error instanceof TypeError) return new ErrorDeApi(0, textoPorEstado(0))
  },
}

export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:5320',
  // Se resuelve en cada petición para que las pruebas puedan simular fetch.
  fetch: (peticion) => globalThis.fetch(peticion),
})
api.use(middleware)

function conCuerpo(error: unknown): error is { mensaje?: unknown; version?: unknown } {
  return typeof error === 'object' && error !== null
}

export function exigir<T>(r: { data?: T; error?: unknown; response: Response }): T {
  if (!r.response.ok || r.error !== undefined) {
    const estado = r.response.status
    const cuerpo = conCuerpo(r.error) ? r.error : {}
    const mensaje = typeof cuerpo.mensaje === 'string' && cuerpo.mensaje ? cuerpo.mensaje : textoPorEstado(estado)
    const version = typeof cuerpo.version === 'number' ? cuerpo.version : undefined
    throw new ErrorDeApi(estado, mensaje, version)
  }
  return r.data as T
}
