import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { alNoAutorizado, api, ErrorDeApi, exigir, fijarFuenteDeToken } from './cliente'

function respuesta(estado: number, cuerpo?: unknown): Response {
  return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: cuerpo === undefined ? {} : { 'Content-Type': 'application/json' },
  })
}

describe('cliente de la API', () => {
  const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()
  const alCaducar = vi.fn()

  beforeEach(() => {
    fetchSimulado.mockReset()
    alCaducar.mockReset()
    vi.stubGlobal('fetch', fetchSimulado)
    fijarFuenteDeToken(() => null)
    alNoAutorizado(alCaducar)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('con token lleva Authorization: Bearer', async () => {
    fetchSimulado.mockResolvedValue(respuesta(200, {}))
    fijarFuenteDeToken(() => 't')
    await api.GET('/salud')
    expect(fetchSimulado.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer t')
  })

  it('sin token no lleva Authorization', async () => {
    fetchSimulado.mockResolvedValue(respuesta(200, {}))
    await api.GET('/salud')
    expect(fetchSimulado.mock.calls[0][0].headers.has('Authorization')).toBe(false)
  })

  it('un 401 con token avisa de que no está autorizado', async () => {
    fetchSimulado.mockResolvedValue(respuesta(401))
    fijarFuenteDeToken(() => 't')
    await api.GET('/salud')
    expect(alCaducar).toHaveBeenCalledOnce()
  })

  it('un 401 sin token no avisa', async () => {
    fetchSimulado.mockResolvedValue(respuesta(401))
    await api.GET('/salud')
    expect(alCaducar).not.toHaveBeenCalled()
  })

  it('exigir convierte un 412 en ErrorDeApi con estado y versión', async () => {
    fetchSimulado.mockResolvedValue(respuesta(412, { mensaje: 'x', version: 7 }))
    const r = await api.GET('/salud')
    const error = (() => {
      try {
        exigir(r)
      } catch (e) {
        return e
      }
    })()
    expect(error).toBeInstanceOf(ErrorDeApi)
    expect(error).toMatchObject({ estado: 412, mensaje: 'x', version: 7 })
  })

  it('exigir usa el texto por estado cuando no hay cuerpo', async () => {
    fetchSimulado.mockResolvedValue(respuesta(404))
    const r = await api.GET('/salud')
    expect(() => exigir(r)).toThrow('No existe o no es tuyo')
  })

  it('exigir devuelve los datos cuando todo va bien', async () => {
    fetchSimulado.mockResolvedValue(respuesta(200, { estado: 'ok' }))
    const r = await api.GET('/salud')
    expect(exigir(r)).toEqual({ estado: 'ok' })
  })

  it('un fallo de red es un ErrorDeApi con estado 0', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await api.GET('/salud').then(exigir, (e: unknown) => e)
    expect(error).toBeInstanceOf(ErrorDeApi)
    expect(error).toMatchObject({ estado: 0, mensaje: 'No hay conexión' })
  })
})
