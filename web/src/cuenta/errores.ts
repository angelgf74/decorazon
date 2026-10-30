import { ErrorDeApi } from '../api/cliente'
import { textos } from '../textos'

export function mensajeDeError(e: unknown): string {
  return e instanceof ErrorDeApi ? e.mensaje : textos.api.inesperado
}
