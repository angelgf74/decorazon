// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CLAVE_RECARGA, conectarRecargaPorVersion, sinRecargar, versionCargada } from './recargaPorVersion'

function fallo(): Event {
  return new Event('vite:preloadError', { cancelable: true })
}

describe('recarga ante un fragmento de una versión anterior', () => {
  afterEach(() => sessionStorage.clear())

  it('la primera vez recarga la página y marca que ya lo hizo', () => {
    const recargar = vi.fn()
    const desconectar = conectarRecargaPorVersion(recargar)
    const evento = fallo()
    window.dispatchEvent(evento)
    expect(recargar).toHaveBeenCalledTimes(1)
    expect(evento.defaultPrevented).toBe(true)
    expect(sessionStorage.getItem(CLAVE_RECARGA)).not.toBeNull()
    desconectar()
  })

  it('si acaba de recargar, no vuelve a recargar y deja pasar el error', () => {
    sessionStorage.setItem(CLAVE_RECARGA, String(Date.now() - 5_000))
    const recargar = vi.fn()
    const desconectar = conectarRecargaPorVersion(recargar)
    const evento = fallo()
    window.dispatchEvent(evento)
    expect(recargar).not.toHaveBeenCalled()
    expect(evento.defaultPrevented).toBe(false)
    desconectar()
  })

  it('una marca de hace más de un minuto (otro despliegue) no impide recargar', () => {
    sessionStorage.setItem(CLAVE_RECARGA, String(Date.now() - 61_000))
    const recargar = vi.fn()
    const desconectar = conectarRecargaPorVersion(recargar)
    const evento = fallo()
    window.dispatchEvent(evento)
    expect(recargar).toHaveBeenCalledTimes(1)
    expect(evento.defaultPrevented).toBe(true)
    desconectar()
  })

  it('cuando el fragmento carga bien, borra la marca', () => {
    sessionStorage.setItem(CLAVE_RECARGA, '1')
    versionCargada()
    expect(sessionStorage.getItem(CLAVE_RECARGA)).toBeNull()
  })

  it('un fallo durante una carga en segundo plano no recarga ni marca, y deja pasar el error', async () => {
    const recargar = vi.fn()
    const desconectar = conectarRecargaPorVersion(recargar)
    const evento = fallo()
    await expect(sinRecargar(async () => {
      window.dispatchEvent(evento)
      throw new Error('Failed to fetch dynamically imported module')
    })).rejects.toThrow()
    expect(recargar).not.toHaveBeenCalled()
    expect(evento.defaultPrevented).toBe(false)
    expect(sessionStorage.getItem(CLAVE_RECARGA)).toBeNull()
    // Acabada la carga en segundo plano, un fallo vuelve a recargar.
    window.dispatchEvent(fallo())
    expect(recargar).toHaveBeenCalledTimes(1)
    desconectar()
  })
})
