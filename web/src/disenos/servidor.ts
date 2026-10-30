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

// El esquema de la API tipa el contenido como objeto sin propiedades conocidas.
function contenidoParaEnviar(doc: DocumentoDiseno): Record<string, never> {
  return redondearNumeros(doc) as unknown as Record<string, never>
}

export async function listarDisenos(): Promise<ResumenDiseno[]> {
  return exigir(await api.GET('/disenos'))
}

export async function obtenerDiseno(id: string): Promise<{ diseno: DisenoServidor; version: number }> {
  const r = exigir(await api.GET('/disenos/{id}', { params: { path: { id } } }))
  return { diseno: validar(r), version: r.version }
}

export async function crearDiseno(nombre: string, doc: DocumentoDiseno): Promise<DisenoServidor> {
  const body = { nombre, tipoEstancia: doc.estancia.tipo, contenido: contenidoParaEnviar(doc) }
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

export async function borrarDiseno(id: string): Promise<void> {
  exigir(await api.DELETE('/disenos/{id}', { params: { path: { id } } }))
}
