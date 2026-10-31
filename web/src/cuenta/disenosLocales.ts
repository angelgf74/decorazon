import { ErrorDeApi } from '../api/cliente'
import { crearDiseno, listarDisenos, obtenerDiseno } from '../disenos/servidor'
import { almacen } from '../editor/estado/almacen'
import {
  almacenamientoSeguro, borrarCopiasLocales, CLAVE_DESCARTADO, CLAVE_DUENO_COPIAS, CLAVE_ID_DE_SUBIDA, CLAVE_REGISTRO_ENVIADO, disenoNoVacio,
  guardarCopiaLocal, listarCopiasLocales, type CopiaListada,
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
  const st = almacenamientoSeguro()
  guardarDisenoLocal(st, null)
  olvidarIdDeSubida(st)
  if (almacen.getState().origen.tipo === 'anonimo') almacen.getState().descartar()
}

function olvidarIdDeSubida(st: Storage | null): void {
  try {
    st?.removeItem(CLAVE_ID_DE_SUBIDA)
  } catch {
    // sin acceso: no hay nada que borrar
  }
}

/** El id de una subida a medias o uno nuevo, guardado antes del POST para que un reintento lo reutilice. */
function idDeSubida(st: Storage | null): string {
  try {
    const guardado = st?.getItem(CLAVE_ID_DE_SUBIDA)
    if (guardado) return guardado
  } catch {
    // sin acceso: este intento usa un id que no se recordará
  }
  const id = crypto.randomUUID()
  try {
    st?.setItem(CLAVE_ID_DE_SUBIDA, id)
  } catch {
    // sin espacio: igual
  }
  return id
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
    const coincide = async (id: string) => contenidoNormalizado((await obtenerDiseno(id)).diseno.contenido) === buscado
    if (!(await alguno(candidatos.map((c) => c.id), coincide))) return false
    st.removeItem(CLAVE_REGISTRO_ENVIADO)
    return true
  } catch {
    return false
  }
}

const PETICIONES_A_LA_VEZ = 4

/** Prueba los ids en paralelo, unos pocos a la vez; deja de pedir en cuanto uno cumple o alguno falla. */
async function alguno(ids: string[], cumple: (id: string) => Promise<boolean>): Promise<boolean> {
  let siguiente = 0
  let encontrado = false
  let fallo = false
  const trabajar = async () => {
    while (!encontrado && !fallo && siguiente < ids.length) {
      const id = ids[siguiente++]!
      try {
        if (await cumple(id)) encontrado = true
      } catch {
        fallo = true
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(PETICIONES_A_LA_VEZ, ids.length) }, trabajar))
  return encontrado
}

export type ResultadoDeSubir = { id: string } | { error: string }

/** Sube el diseño anónimo como diseño nuevo de la cuenta; si sale bien, lo descarta del navegador. */
export async function subirDisenoAnonimo(doc: DocumentoDiseno): Promise<ResultadoDeSubir> {
  const st = almacenamientoSeguro()
  try {
    const d = await crearDiseno(textos.disenos.nombrePorDefecto, doc, idDeSubida(st))
    // Si lo devuelto difiere del diseño anónimo de ahora (se editó durante la subida, o es un alta anterior con
    // contenido antiguo), va como copia pendiente: al abrir el diseño, la sincronización sube el actual.
    const actual = disenoAnonimo()
    const editado = actual !== null && contenidoNormalizado(actual) !== contenidoNormalizado(d.contenido)
    const copiado = editado && guardarCopiaLocal(st, d.id, { version: d.version, nombre: d.nombre, documento: actual, pendiente: true })
    // Sin copia, lo editado se queda en el diseño anónimo antes que perderse.
    if (!editado || copiado) descartarDisenoAnonimo()
    return { id: d.id }
  } catch (e) {
    // Con 409 el id es de otra cuenta o no se creó nada (límite de diseños): el siguiente intento estrena id.
    if (e instanceof ErrorDeApi && e.estado === 409) olvidarIdDeSubida(st)
    return { error: e instanceof ErrorDeApi && e.estado === 409 ? textos.disenos.limiteConDisenoLocal : mensajeDeError(e) }
  }
}

const GUARDADOS_SIN_TERMINAR = new Set(['pendiente', 'sinConexion', 'conflicto', 'error'])

/** Algo de un diseño del servidor aún no está en el servidor: copias pendientes, el abierto sin guardar o un guardado en marcha. */
export function hayCambiosSinSubir(): boolean {
  const e = almacen.getState()
  if (e.origen.tipo === 'servidor' && GUARDADOS_SIN_TERMINAR.has(e.guardado)) return true
  if (hayGuardadosEnMarcha()) return true
  return listarCopiasLocales(almacenamientoSeguro()).some((c) => c.pendiente)
}

/** Las copias locales de la cuenta `correo` (null si aún no se sabe): sin dueño conocido o de otra cuenta, ninguna. */
export function copiasDeLaCuenta(correo: string | null): CopiaListada[] {
  const st = almacenamientoSeguro()
  try {
    const dueno = st?.getItem(CLAVE_DUENO_COPIAS) ?? null
    if (dueno === null || (correo !== null && dueno !== correo.trim().toLowerCase())) return []
  } catch {
    return []
  }
  return listarCopiasLocales(st)
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
    st?.removeItem(CLAVE_ID_DE_SUBIDA)
  } catch {
    // sin acceso: no hay nada que borrar
  }
  guardarDisenoLocal(st, null)
  almacen.getState().volverAAnonimo(st)
  almacen.getState().descartar()
}

/** La sesión se cerró en otra pestaña: esta deja el diseño abierto sin subir nada ni tocar el almacenamiento compartido. */
export function soltarDisenosDeLaSesion(): void {
  anularSincronizacion(almacen)
  almacen.getState().volverAAnonimo(almacenamientoSeguro())
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

/** "Nuevo diseño": vacía el editor; el diseño anónimo siguiente no debe heredar el id de subida del anterior. */
export function empezarDeNuevo(): void {
  olvidarIdDeSubida(almacenamientoSeguro())
  almacen.getState().descartar()
}
