// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { evento, iniciarAnalitica, reiniciarAnalitica, type DatosDeEvento } from './analitica'

afterEach(() => {
  document.head.innerHTML = ''
  history.replaceState(null, '', '/')
  delete window.webanalytics
  reiniciarAnalitica()
})

describe('evento', () => {
  const tracker = () => ({ evento: vi.fn<(nombre: string, datos?: DatosDeEvento) => void>() })
  const llamadas = () => vi.mocked(window.webanalytics!.evento).mock.calls
  const script = () => document.querySelector<HTMLScriptElement>('script[data-site-id]')!

  beforeEach(() => reiniciarAnalitica())

  it('con el tracker ya cargado lo llama al momento, con nombre y datos', () => {
    iniciarAnalitica('abc')
    window.webanalytics = tracker()
    evento('mueble-anadido', { tipo: 'cama' })
    expect(window.webanalytics.evento).toHaveBeenCalledWith('mueble-anadido', { tipo: 'cama' })
  })

  it('antes de que cargue el tracker se encola y sale al cargar, en orden', () => {
    iniciarAnalitica('abc')
    evento('ejemplo-abierto', { ejemplo: 'Cocina' })
    evento('vista-3d')
    window.webanalytics = tracker()
    expect(window.webanalytics.evento).not.toHaveBeenCalled()
    script().dispatchEvent(new Event('load'))
    expect(llamadas()).toEqual([['ejemplo-abierto', { ejemplo: 'Cocina' }], ['vista-3d']])
    evento('hoja-impresa')
    expect(window.webanalytics.evento).toHaveBeenCalledTimes(3)
  })

  it('sin analítica (sin sitio, o en una página que no se mide) no encola ni llama', () => {
    iniciarAnalitica(undefined)
    window.webanalytics = tracker()
    evento('vista-3d')
    expect(window.webanalytics.evento).not.toHaveBeenCalled()
  })

  it('si el script del tracker falla (bloqueado), la cola se vacía sin llamar a nada y lo siguiente se descarta', () => {
    iniciarAnalitica('abc')
    evento('vista-3d')
    script().dispatchEvent(new Event('error'))
    window.webanalytics = tracker()
    evento('hoja-impresa')
    expect(window.webanalytics.evento).not.toHaveBeenCalled()
  })

  it('la cola guarda como mucho 20: se pierden los más antiguos', () => {
    iniciarAnalitica('abc')
    for (let i = 0; i < 25; i++) evento(`e-${i}`)
    window.webanalytics = tracker()
    script().dispatchEvent(new Event('load'))
    const nombres = llamadas().map(([n]) => n)
    expect(nombres).toHaveLength(20)
    expect(nombres[0]).toBe('e-5')
    expect(nombres[19]).toBe('e-24')
  })
})

describe('iniciarAnalitica', () => {

  it('sin sitio no añade el script', () => {
    iniciarAnalitica(undefined)
    iniciarAnalitica('')
    expect(document.querySelectorAll('script[data-site-id]')).toHaveLength(0)
  })

  it('con sitio añade un único script aunque se llame dos veces', () => {
    iniciarAnalitica('abc')
    iniciarAnalitica('abc')
    const scripts = document.querySelectorAll<HTMLScriptElement>('script[data-site-id]')
    expect(scripts).toHaveLength(1)
    expect(scripts[0].getAttribute('data-site-id')).toBe('abc')
    // El tracker solo lee el sitio de ?site= (sin él responde 400); data-site-id es para no cargarlo dos veces.
    expect(scripts[0].src).toBe('https://webanalytics-api.angelgf.com.es/tracker.js?site=abc')
    expect(scripts[0].async).toBe(true)
  })

  it('no carga el tracker en la página de un diseño compartido: el enlace va en la ruta', () => {
    history.replaceState(null, '', '/compartido/secreto')
    iniciarAnalitica('abc')
    expect(document.querySelectorAll('script[data-site-id]')).toHaveLength(0)
  })

  it('no carga el tracker en páginas con token en la URL', () => {
    history.replaceState(null, '', '/registro/confirmar?token=secreto')
    iniciarAnalitica('abc')
    expect(document.querySelectorAll('script[data-site-id]')).toHaveLength(0)
  })
})
