import { ErrorDeApi } from '../api/cliente'
import { crearDiseno } from '../disenos/servidor'
import { almacen } from '../editor/estado/almacen'
import {
  almacenamientoSeguro, borrarCopiasLocales, CLAVE_DESCARTADO, CLAVE_DUENO_COPIAS, CLAVE_REGISTRO_ENVIADO, disenoNoVacio,
  guardarDisenoLocal,
} from '../editor/persistencia/local'
import { anularSincronizacion } from '../editor/persistencia/sincronizacion'
import { serializarDocumento, type DocumentoDiseno } from '../nucleo'
import { textos } from '../textos'
import { mensajeDeError } from './errores'

/** El diseño anónimo del editor, si tiene algo dentro. */
export function disenoAnonimo(): DocumentoDiseno | null {
  const e = almacen.getState()
  return e.origen.tipo === 'anonimo' && disenoNoVacio(e.documento) ? e.documento : null
}

export function descartarDisenoAnonimo(): void {
  guardarDisenoLocal(almacenamientoSeguro(), null)
  if (almacen.getState().origen.tipo === 'anonimo') almacen.getState().descartar()
}

/** Si el diseño es el que viajó con el registro (ya está en la cuenta), borra esa marca y responde que sí. */
export function enviadoConElRegistro(doc: DocumentoDiseno): boolean {
  const st = almacenamientoSeguro()
  try {
    if (st === null || st.getItem(CLAVE_REGISTRO_ENVIADO) !== serializarDocumento(doc)) return false
    st.removeItem(CLAVE_REGISTRO_ENVIADO)
    return true
  } catch {
    return false
  }
}

export type ResultadoDeSubir = { id: string } | { error: string }

/** Sube el diseño anónimo como diseño nuevo de la cuenta; si sale bien, lo descarta del navegador. */
export async function subirDisenoAnonimo(doc: DocumentoDiseno): Promise<ResultadoDeSubir> {
  try {
    const d = await crearDiseno(textos.disenos.nombrePorDefecto, doc)
    descartarDisenoAnonimo()
    return { id: d.id }
  } catch (e) {
    return { error: e instanceof ErrorDeApi && e.estado === 409 ? textos.disenos.limiteConDisenoLocal : mensajeDeError(e) }
  }
}

/** Al cerrar la sesión: no queda en el navegador nada de la cuenta y el editor anónimo empieza vacío. */
export function olvidarDisenosLocales(): void {
  const st = almacenamientoSeguro()
  // Antes de borrar: un guardado que termine después no debe volver a escribir su copia.
  anularSincronizacion(almacen)
  borrarCopiasLocales(st)
  try {
    st?.removeItem(CLAVE_DUENO_COPIAS)
    st?.removeItem(CLAVE_DESCARTADO)
  } catch {
    // sin acceso: no hay nada que borrar
  }
  guardarDisenoLocal(st, null)
  almacen.getState().volverAAnonimo(st)
  almacen.getState().descartar()
}

/** Las copias locales son de una sola cuenta: al entrar con otra, o sin saber de cuál son, se borran. */
export function fijarDuenoDeCopias(correo: string): void {
  const st = almacenamientoSeguro()
  if (st === null) return
  const dueno = correo.trim().toLowerCase()
  try {
    if (st.getItem(CLAVE_DUENO_COPIAS) !== dueno) {
      anularSincronizacion(almacen)
      borrarCopiasLocales(st)
    }
    st.setItem(CLAVE_DUENO_COPIAS, dueno)
  } catch {
    // sin acceso: tampoco se pueden leer las copias
  }
}
