// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { documentoNuevo } from '../nucleo'
import { respuesta } from '../pruebas/respuesta'
import { compartirDiseno, crearDiseno, dejarDeCompartir, direccionCompartida, guardarDiseno, obtenerCompartido, obtenerDiseno, subirVistaPrevia } from './servidor'

const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()
const ID = '11111111-1111-1111-1111-111111111111'

function completo(contenido: unknown) {
  return { id: ID, nombre: 'D', tipoEstancia: 'cocina', fechaDeCreacion: '2026-01-01T00:00:00Z', fechaDeModificacion: '2026-01-01T00:00:00Z', version: 3, contenido }
}

beforeEach(() => {
  fetchSimulado.mockReset()
  vi.stubGlobal('fetch', fetchSimulado)
})
afterEach(() => vi.unstubAllGlobals())

describe('servidor de diseños', () => {
  it('guardarDiseno envía If-Match entre comillas', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(200, completo(documentoNuevo('cocina', 400, 300, 250))))
    await guardarDiseno(ID, 3, { nombre: 'Nuevo', doc: documentoNuevo('cocina', 400, 300, 250) })
    const peticion = fetchSimulado.mock.calls[0]![0]
    expect(peticion.method).toBe('PUT')
    expect(peticion.headers.get('If-Match')).toBe('"3"')
  })

  it('guardarDiseno envía el diseño entero: nombre, tipo de estancia y contenido redondeado', async () => {
    const doc = documentoNuevo('dormitorio', 400.004, 300.006, 250)
    fetchSimulado.mockResolvedValueOnce(respuesta(200, completo(documentoNuevo('dormitorio', 400, 300.01, 250))))
    await guardarDiseno(ID, 7, { nombre: 'Dormitorio', doc })
    const cuerpo = (await fetchSimulado.mock.calls[0]![0].json()) as { nombre: string; tipoEstancia: string; contenido: typeof doc }
    expect(cuerpo.nombre).toBe('Dormitorio')
    expect(cuerpo.tipoEstancia).toBe('dormitorio')
    expect(cuerpo.contenido.estancia.planta[1]!.x).toBe(400)
    expect(cuerpo.contenido.estancia.planta[2]!.y).toBe(300.01)
  })

  it('guardarDiseno con 412 lanza ErrorDeApi con la versión remota', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(412, { mensaje: 'Cambiado', version: 9 }))
    await expect(guardarDiseno(ID, 4, { nombre: 'Salón', doc: documentoNuevo('salon', 400, 300, 250) })).rejects.toMatchObject({ estado: 412, version: 9 })
  })

  it('guardarDiseno toma versión y nombre de la respuesta sin revalidar el contenido: es el que se acaba de enviar', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(200, { ...completo({ formato: 1 }), version: 8, nombre: 'Guardado' }))
    const r = await guardarDiseno(ID, 7, { nombre: 'Guardado', doc: documentoNuevo('cocina', 400, 300, 250) })
    expect(r).toMatchObject({ version: 8, nombre: 'Guardado' })
  })

  it('crearDiseno envía el contenido redondeado y el tipo del documento', async () => {
    const doc = documentoNuevo('cocina', 400.004, 300, 250)
    fetchSimulado.mockResolvedValueOnce(respuesta(201, completo(documentoNuevo('cocina', 400, 300, 250))))
    await crearDiseno('Mi cocina', doc)
    const cuerpo = (await fetchSimulado.mock.calls[0]![0].json()) as { nombre: string; tipoEstancia: string; contenido: typeof doc }
    expect(cuerpo.nombre).toBe('Mi cocina')
    expect(cuerpo.tipoEstancia).toBe('cocina')
    expect(cuerpo.contenido.estancia.planta[1]!.x).toBe(400)
  })

  it('crearDiseno manda el id cuando se le pasa', async () => {
    const doc = documentoNuevo('cocina', 400, 300, 250)
    fetchSimulado.mockResolvedValueOnce(respuesta(201, completo(doc)))
    await crearDiseno('Mi cocina', doc, ID)
    expect(((await fetchSimulado.mock.calls[0]![0].json()) as { id?: string }).id).toBe(ID)

    fetchSimulado.mockResolvedValueOnce(respuesta(201, completo(doc)))
    await crearDiseno('Mi cocina', doc)
    expect(await fetchSimulado.mock.calls[1]![0].json()).not.toHaveProperty('id')
  })

  it('un contenido inválido del servidor lanza un error', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(200, completo({ formato: 1 })))
    await expect(obtenerDiseno(ID)).rejects.toThrow()
  })

  it('obtenerDiseno devuelve la versión', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(200, completo(documentoNuevo('cocina', 400, 300, 250))))
    const r = await obtenerDiseno(ID)
    expect(r.version).toBe(3)
    expect(r.diseno.contenido.estancia.tipo).toBe('cocina')
  })

  it('compartirDiseno pide el enlace con PUT y devuelve el token', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(200, { enlace: 'tok_1' }))
    expect(await compartirDiseno(ID)).toBe('tok_1')
    const peticion = fetchSimulado.mock.calls[0]![0]
    expect(peticion.method).toBe('PUT')
    expect(new URL(peticion.url).pathname).toBe(`/disenos/${ID}/enlace`)
  })

  it('dejarDeCompartir retira el enlace con DELETE', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(204))
    await dejarDeCompartir(ID)
    const peticion = fetchSimulado.mock.calls[0]![0]
    expect(peticion.method).toBe('DELETE')
    expect(new URL(peticion.url).pathname).toBe(`/disenos/${ID}/enlace`)
  })

  it('obtenerCompartido lee el diseño del enlace y valida su contenido', async () => {
    const doc = documentoNuevo('bano', 250, 200, 250)
    fetchSimulado.mockResolvedValueOnce(respuesta(200, { nombre: 'Baño', tipoEstancia: 'bano', fechaDeModificacion: '2026-11-02T10:00:00Z', contenido: doc }))
    const d = await obtenerCompartido('tok_1')
    expect(d.nombre).toBe('Baño')
    expect(d.contenido.estancia.tipo).toBe('bano')
    expect(new URL(fetchSimulado.mock.calls[0]![0].url).pathname).toBe('/compartidos/tok_1')
    fetchSimulado.mockResolvedValueOnce(respuesta(200, { nombre: 'Roto', tipoEstancia: 'bano', fechaDeModificacion: '2026-11-02T10:00:00Z', contenido: { formato: 9 } }))
    await expect(obtenerCompartido('tok_2')).rejects.toThrow()
  })

  it('subirVistaPrevia manda la imagen tal cual, en image/jpeg, con PUT', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(204))
    await subirVistaPrevia(ID, new Blob(['jpeg'], { type: 'image/jpeg' }))
    const peticion = fetchSimulado.mock.calls[0]![0]
    expect(peticion.method).toBe('PUT')
    expect(new URL(peticion.url).pathname).toBe(`/disenos/${ID}/vista-previa`)
    expect(peticion.headers.get('Content-Type')).toBe('image/jpeg')
    expect(await peticion.text()).toBe('jpeg')
  })

  it('direccionCompartida compone la dirección pública del enlace en esta web', () => {
    expect(direccionCompartida('tok_1')).toBe(`${location.origin}/compartido/tok_1`)
  })
})
