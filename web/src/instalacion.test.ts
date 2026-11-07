// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { conectarInstalacion, estadoDeInstalacion, instalar, reiniciarInstalacion } from './instalacion'

/** El evento que manda Chrome: con prompt() y la decisión del usuario. */
function avisoDeInstalacion(decision: 'accepted' | 'dismissed' = 'accepted') {
  const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt: ReturnType<typeof vi.fn>; userChoice: Promise<{ outcome: string }> }
  e.prompt = vi.fn(async () => {})
  e.userChoice = Promise.resolve({ outcome: decision })
  return e
}

function simularDispositivo({ ua, standalone = false, maxTouchPoints = 0, platform = 'Win32' }: { ua: string; standalone?: boolean; maxTouchPoints?: number; platform?: string }) {
  vi.stubGlobal('navigator', Object.create(navigator, {
    userAgent: { value: ua, configurable: true },
    platform: { value: platform, configurable: true },
    maxTouchPoints: { value: maxTouchPoints, configurable: true },
  }))
  vi.stubGlobal('matchMedia', vi.fn((consulta: string) => ({ matches: consulta.includes('standalone') && standalone, media: consulta, addEventListener() {}, removeEventListener() {} })))
}

beforeEach(() => {
  reiniciarInstalacion()
  simularDispositivo({ ua: 'Mozilla/5.0 (Linux; Android 14) Chrome/140' })
})
afterEach(() => vi.unstubAllGlobals())

describe('instalación como app (M-25)', () => {
  it('sin aviso del navegador ni iOS, no se puede instalar', () => {
    conectarInstalacion()
    expect(estadoDeInstalacion()).toBe('no')
  })

  it('el aviso del navegador se guarda (y se anula, para enseñarlo cuando se quiera), aunque llegue antes de que React monte', () => {
    conectarInstalacion()
    const e = avisoDeInstalacion()
    window.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
    expect(estadoDeInstalacion()).toBe('aviso')
  })

  it('instalar() enseña el aviso y devuelve si se aceptó; después ya no se ofrece', async () => {
    conectarInstalacion()
    const e = avisoDeInstalacion('accepted')
    window.dispatchEvent(e)
    expect(await instalar()).toBe(true)
    expect(e.prompt).toHaveBeenCalledOnce()
    expect(estadoDeInstalacion()).toBe('no')
  })

  it('si se rechaza, instalar() devuelve false y el aviso se ha consumido igual (Chrome solo deja enseñarlo una vez)', async () => {
    conectarInstalacion()
    window.dispatchEvent(avisoDeInstalacion('dismissed'))
    expect(await instalar()).toBe(false)
    expect(estadoDeInstalacion()).toBe('no')
  })

  it('cuando la app queda instalada (appinstalled) deja de ofrecerse', () => {
    conectarInstalacion()
    window.dispatchEvent(avisoDeInstalacion())
    window.dispatchEvent(new Event('appinstalled'))
    expect(estadoDeInstalacion()).toBe('no')
  })

  it('en un iPhone fuera de la pantalla de inicio se ofrecen los pasos; dentro (standalone), nada', () => {
    simularDispositivo({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1' })
    conectarInstalacion()
    expect(estadoDeInstalacion()).toBe('ios')
    simularDispositivo({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1', standalone: true })
    expect(estadoDeInstalacion()).toBe('no')
  })

  it('un iPad se presenta como Mac con pantalla táctil: también son los pasos de iOS', () => {
    simularDispositivo({ ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', platform: 'MacIntel', maxTouchPoints: 5 })
    conectarInstalacion()
    expect(estadoDeInstalacion()).toBe('ios')
  })

  it('ya instalada en Android (standalone) no se ofrece aunque llegue el aviso', () => {
    simularDispositivo({ ua: 'Mozilla/5.0 (Linux; Android 14) Chrome/140', standalone: true })
    conectarInstalacion()
    window.dispatchEvent(avisoDeInstalacion())
    expect(estadoDeInstalacion()).toBe('no')
  })
})

describe('instalar() cuando el navegador se niega', () => {
  it('si prompt() lanza (ya se enseñó, sin gesto), devuelve false sin dejar una promesa rechazada', async () => {
    conectarInstalacion()
    const e = avisoDeInstalacion()
    e.prompt = vi.fn(async () => { throw new DOMException('ya enseñado', 'InvalidStateError') })
    window.dispatchEvent(e)
    await expect(instalar()).resolves.toBe(false)
  })
})
