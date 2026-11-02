import { api, exigir } from '../api/cliente'
import type { components } from '../api/esquema'
import { redondearNumeros, validarDocumento, type DocumentoDiseno } from '../nucleo'

export type ResumenDiseno = components['schemas']['RespuestaDeResumenDeDiseno']
export type DisenoServidor = Omit<components['schemas']['RespuestaDeDiseno'], 'contenido'> & { contenido: DocumentoDiseno }

type RespuestaCruda = components['schemas']['RespuestaDeDiseno']

function validar(r: RespuestaCruda): DisenoServidor {
  const v = validarDocumento(r.contenido)
  if (!v.valido) throw new Error(`El diseño ${r.id} del servidor no es válido: ${v.errores.join('; ')}`)
  return { ...r, contenido: v.documento }
}

/** El contenido tal como viaja: redondeado. El esquema de la API lo tipa como objeto sin propiedades conocidas. */
export function contenidoParaEnviar(doc: DocumentoDiseno): Record<string, never> {
  return redondearNumeros(doc) as unknown as Record<string, never>
}

export async function listarDisenos(): Promise<ResumenDiseno[]> {
  return exigir(await api.GET('/disenos'))
}

export async function obtenerDiseno(id: string): Promise<{ diseno: DisenoServidor; version: number }> {
  const r = exigir(await api.GET('/disenos/{id}', { params: { path: { id } } }))
  return { diseno: validar(r), version: r.version }
}

/** Con `id`, el alta es idempotente: repetirla devuelve el diseño ya creado en lugar de crear otro. */
export async function crearDiseno(nombre: string, doc: DocumentoDiseno, id?: string): Promise<DisenoServidor> {
  const body = { ...(id !== undefined && { id }), nombre, tipoEstancia: doc.estancia.tipo, contenido: contenidoParaEnviar(doc) }
  return validar(exigir(await api.POST('/disenos', { body })))
}

export type DisenoGuardado = Omit<RespuestaCruda, 'contenido'>

/**
 * PUT reemplaza el diseño entero: siempre viajan el nombre, el tipo de estancia y el contenido.
 * De la respuesta se toman versión y nombre sin revalidar el contenido: es el que se acaba de enviar.
 * Si se rechazara, el guardado ya hecho contaría como fallo y la versión no avanzaría: conflicto con uno mismo.
 */
export async function guardarDiseno(
  id: string,
  version: number,
  diseno: { nombre: string; doc: DocumentoDiseno },
): Promise<DisenoGuardado> {
  const body = { nombre: diseno.nombre, tipoEstancia: diseno.doc.estancia.tipo, contenido: contenidoParaEnviar(diseno.doc) }
  const r = await api.PUT('/disenos/{id}', { params: { path: { id }, header: { 'If-Match': `"${version}"` } }, body })
  const { contenido: _enviado, ...guardado } = exigir(r)
  return guardado
}

export async function duplicarDiseno(id: string): Promise<DisenoServidor> {
  return validar(exigir(await api.POST('/disenos/{id}/duplicar', { params: { path: { id } } })))
}

export async function compartirDiseno(id: string): Promise<string> {
  return exigir(await api.PUT('/disenos/{id}/enlace', { params: { path: { id } } })).enlace
}

export async function dejarDeCompartir(id: string): Promise<void> {
  exigir(await api.DELETE('/disenos/{id}/enlace', { params: { path: { id } } }))
}

export type DisenoCompartido = Omit<components['schemas']['RespuestaDeDisenoCompartido'], 'contenido'> & { contenido: DocumentoDiseno }

/** Lo que ve quien tiene el enlace, sin sesión. Un contenido que no pasa la validación es un error, como en los demás. */
export async function obtenerCompartido(enlace: string): Promise<DisenoCompartido> {
  const r = exigir(await api.GET('/compartidos/{enlace}', { params: { path: { enlace } } }))
  const v = validarDocumento(r.contenido)
  if (!v.valido) throw new Error(`El diseño compartido no es válido: ${v.errores.join('; ')}`)
  return { ...r, contenido: v.documento }
}

/** La dirección pública del enlace en esta misma web. */
export function direccionCompartida(enlace: string): string {
  return `${location.origin}/compartido/${encodeURIComponent(enlace)}`
}

/** La imagen de la tarjeta del enlace, tal cual (JPEG): el cuerpo no es JSON. */
export async function subirVistaPrevia(id: string, imagen: Blob): Promise<void> {
  exigir(await api.PUT('/disenos/{id}/vista-previa', {
    params: { path: { id } },
    body: imagen as unknown as string,
    bodySerializer: (cuerpo) => cuerpo as unknown as BodyInit,
    headers: { 'Content-Type': 'image/jpeg' },
  }))
}

export async function borrarDiseno(id: string): Promise<void> {
  exigir(await api.DELETE('/disenos/{id}', { params: { path: { id } } }))
}
