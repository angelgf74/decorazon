// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { conectarRecargaPorVersion } from '../../recargaPorVersion'
import { ESPERA_PRECARGA_MS, precargarVista3D } from './precargar'
import type Vista3D from './Vista3D'

const modulo = { default: (() => null) as unknown as typeof Vista3D }

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  sessionStorage.clear()
})

describe('precarga de la vista 3D', () => {
  it('pasada la espera, con WebGL, carga el fragmento una vez y entrega el módulo', async () => {
    const cargar = vi.fn(() => Promise.resolve(modulo))
    const alCargar = vi.fn()
    precargarVista3D({ alCargar, cargar })
    await vi.advanceTimersByTimeAsync(ESPERA_PRECARGA_MS - 1)
    expect(cargar).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(cargar).toHaveBeenCalledTimes(1)
    expect(alCargar).toHaveBeenCalledExactlyOnceWith(modulo)
  })

  it('con requestIdleCallback, espera a que el navegador esté libre; cancelar entonces anula la petición', async () => {
    const pedidas: (() => void)[] = []
    const cancelIdle = vi.fn()
    vi.stubGlobal('requestIdleCallback', (f: () => void) => pedidas.push(f))
    vi.stubGlobal('cancelIdleCallback', cancelIdle)
    try {
      const cargar = vi.fn(() => Promise.resolve(modulo))
      const cancelar = precargarVista3D({ alCargar: () => {}, cargar })
      await vi.advanceTimersByTimeAsync(ESPERA_PRECARGA_MS + 1000)
      expect(pedidas).toHaveLength(1)
      expect(cargar).not.toHaveBeenCalled()
      cancelar()
      expect(cancelIdle).toHaveBeenCalledWith(1)
      const otra = precargarVista3D({ alCargar: () => {}, cargar })
      await vi.advanceTimersByTimeAsync(ESPERA_PRECARGA_MS)
      pedidas[1]()
      expect(cargar).toHaveBeenCalledTimes(1)
      otra()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('cancelada antes de la espera (se sale del editor), no carga', async () => {
    const cargar = vi.fn(() => Promise.resolve(modulo))
    const cancelar = precargarVista3D({ alCargar: () => {}, cargar })
    cancelar()
    await vi.advanceTimersByTimeAsync(ESPERA_PRECARGA_MS + 1000)
    expect(cargar).not.toHaveBeenCalled()
  })

  it('cancelada con la carga en marcha, no entrega el módulo', async () => {
    let terminar: (m: typeof modulo) => void = () => {}
    const cargar = vi.fn(() => new Promise<typeof modulo>((ok) => { terminar = ok }))
    const alCargar = vi.fn()
    const cancelar = precargarVista3D({ alCargar, cargar })
    await vi.advanceTimersByTimeAsync(ESPERA_PRECARGA_MS + 1000)
    expect(cargar).toHaveBeenCalledTimes(1)
    cancelar()
    terminar(modulo)
    await vi.advanceTimersByTimeAsync(0)
    expect(alCargar).not.toHaveBeenCalled()
  })

  it('un fallo de la carga ni se propaga ni recarga la página: eso queda para cuando se pulse 3D', async () => {
    const recargar = vi.fn()
    const desconectar = conectarRecargaPorVersion(recargar)
    const alCargar = vi.fn()
    const cargar = vi.fn(() => {
      window.dispatchEvent(new Event('vite:preloadError', { cancelable: true }))
      return Promise.reject(new Error('Failed to fetch dynamically imported module'))
    })
    precargarVista3D({ alCargar, cargar })
    await vi.advanceTimersByTimeAsync(ESPERA_PRECARGA_MS + 1000)
    expect(cargar).toHaveBeenCalledTimes(1)
    expect(recargar).not.toHaveBeenCalled()
    expect(alCargar).not.toHaveBeenCalled()
    desconectar()
  })
})
