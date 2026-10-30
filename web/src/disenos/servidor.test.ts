import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { documentoNuevo } from '../nucleo'
import { respuesta } from '../pruebas/respuesta'
import { crearDiseno, guardarDiseno, obtenerDiseno } from './servidor'

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
    await guardarDiseno(ID, 3, { nombre: 'Nuevo' })
    const peticion = fetchSimulado.mock.calls[0]![0]
    expect(peticion.method).toBe('PUT')
    expect(peticion.headers.get('If-Match')).toBe('"3"')
    expect(await peticion.json()).toEqual({ nombre: 'Nuevo' })
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
})
