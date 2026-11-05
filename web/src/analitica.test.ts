// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { iniciarAnalitica } from './analitica'

describe('iniciarAnalitica', () => {
  afterEach(() => {
    document.head.innerHTML = ''
    history.replaceState(null, '', '/')
  })

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
