import { ErrorDeApi } from '../api/cliente'
import { crearDiseno, listarDisenos, obtenerDiseno } from '../disenos/servidor'
import { almacen } from '../editor/estado/almacen'
import {
  almacenamientoSeguro, borrarCopiasLocales, CLAVE_DESCARTADO, CLAVE_DUENO_COPIAS, CLAVE_REGISTRO_ENVIADO, disenoNoVacio,
  guardarCopiaLocal, leerCopiaLocal, PREFIJO_COPIA,
  guardarDisenoLocal,
} from '../editor/persistencia/local'
import { anularSincronizacion, hayGuardadosEnMarcha } from '../editor/persistencia/sincronizacion'
import { redondearNumeros, serializarDocumento, validarDocumento, type DocumentoDiseno } from '../nucleo'
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

// Contenido comparable: validado, redondeado y con las claves ordenadas (jsonb las reordena).
function contenidoNormalizado(dato: unknown): string | null {
  const v = validarDocumento(dato)
  if (!v.valido) return null
  const ordenar = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(ordenar)
    if (typeof x !== 'object' || x === null) return x
    return Object.fromEntries(Object.keys(x).sort().map((k) => [k, ordenar((x as Record<string, unknown>)[k])]))
  }
  return JSON.stringify(ordenar(redondearNumeros(v.documento)))
}

/**
 * Si el diseño es el que viajó con el registro y la cuenta lo tiene de verdad, borra esa marca y responde que sí.
 * Ante cualquier duda (otra cuenta, enlace caducado, sin red, error) responde que no: nunca se descarta sin certeza.
 */
export async function yaEstaEnLaCuenta(doc: DocumentoDiseno): Promise<boolean> {
  const st = almacenamientoSeguro()
  try {
    if (st === null || st.getItem(CLAVE_REGISTRO_ENVIADO) !== serializarDocumento(doc)) return false
    const buscado = contenidoNormalizado(doc)
    if (buscado === null) return false
    const primero = textos.cuenta.registro.nombrePorDefecto
    const candidatos = (await listarDisenos())
      .filter((d) => d.tipoEstancia === doc.estancia.tipo)
      .sort((a, b) => Number(b.nombre === primero) - Number(a.nombre === primero))
    for (const c of candidatos) {
      const { diseno } = await obtenerDiseno(c.id)
      if (contenidoNormalizado(diseno.contenido) === buscado) {
        st.removeItem(CLAVE_REGISTRO_ENVIADO)
        return true
      }
    }
    return false
  } catch {
    return false
  }
}

export type ResultadoDeSubir = { id: string } | { error: string }

/** Sube el diseño anónimo como diseño nuevo de la cuenta; si sale bien, lo descarta del navegador. */
export async function subirDisenoAnonimo(doc: DocumentoDiseno): Promise<ResultadoDeSubir> {
  try {
    const d = await crearDiseno(textos.disenos.nombrePorDefecto, doc)
    // Lo editado durante la subida va como copia pendiente: al abrir el diseño, la sincronización lo sube.
    const actual = disenoAnonimo()
    const editado = actual !== null && actual !== doc
    const copiado = editado && guardarCopiaLocal(almacenamientoSeguro(), d.id, { version: d.version, nombre: d.nombre, documento: actual, pendiente: true })
    // Sin copia, lo editado se queda en el diseño anónimo antes que perderse.
    if (!editado || copiado) descartarDisenoAnonimo()
    return { id: d.id }
  } catch (e) {
    return { error: e instanceof ErrorDeApi && e.estado === 409 ? textos.disenos.limiteConDisenoLocal : mensajeDeError(e) }
  }
}

const GUARDADOS_SIN_TERMINAR = new Set(['pendiente', 'sinConexion', 'conflicto', 'error'])

/** Algo de un diseño del servidor aún no está en el servidor: copias pendientes, el abierto sin guardar o un guardado en marcha. */
export function hayCambiosSinSubir(): boolean {
  const e = almacen.getState()
  if (e.origen.tipo === 'servidor' && GUARDADOS_SIN_TERMINAR.has(e.guardado)) return true
  if (hayGuardadosEnMarcha()) return true
  const st = almacenamientoSeguro()
  if (st === null) return false
  try {
    const ids = Array.from({ length: st.length }, (_, i) => st.key(i))
      .filter((k): k is string => k?.startsWith(PREFIJO_COPIA) ?? false)
      .map((k) => k.slice(PREFIJO_COPIA.length))
    return ids.some((id) => leerCopiaLocal(st, id)?.pendiente === true)
  } catch {
    return false
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
    st?.removeItem(CLAVE_REGISTRO_ENVIADO)
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
