// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Metadatos from './Metadatos'
import { textos } from './textos'
import { PAGINAS_INDEXABLES, useMetadatos } from './usarMetadatos'

const descripcion = () => document.head.querySelector('meta[name="description"]')?.getAttribute('content')
const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')
const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute('content')

function Prueba({ titulo, desc, indexar }: { titulo: string; desc?: string; indexar?: boolean }) {
  useMetadatos(titulo, desc, { indexar })
  return null
}

beforeEach(() => {
  // Como index.html: título, descripción y canonical de la raíz. El head primero: reescribirlo quita el <title>.
  document.head.innerHTML = '<meta name="description" content="Original"><link rel="canonical" href="https://decorazon.angelgf.com.es/">'
  document.title = 'Decorazon'
  window.history.replaceState(null, '', '/privacidad')
})
afterEach(() => { document.head.innerHTML = '' })

describe('useMetadatos', () => {
  it('pone título, descripción y canonical de la página, y al desmontar deja lo que había', () => {
    const r = render(<Prueba titulo="Privacidad | Decorazon" desc="Qué guardamos" />)
    expect(document.title).toBe('Privacidad | Decorazon')
    expect(descripcion()).toBe('Qué guardamos')
    expect(canonical()).toBe(`${window.location.origin}/privacidad`)
    expect(robots()).toBeUndefined()
    r.unmount()
    expect(document.title).toBe('Decorazon')
    expect(descripcion()).toBe('Original')
    expect(canonical()).toBe('https://decorazon.angelgf.com.es/')
  })

  it('sin indexar: noindex y sin canonical; al desmontar se quita el noindex y vuelve el canonical', () => {
    const r = render(<Prueba titulo="Entrar | Decorazon" indexar={false} />)
    expect(robots()).toBe('noindex')
    expect(canonical()).toBeUndefined()
    expect(descripcion()).toBe('Original')
    r.unmount()
    expect(robots()).toBeUndefined()
    expect(canonical()).toBe('https://decorazon.angelgf.com.es/')
  })

  it('el canonical no lleva la búsqueda ni el fragmento', () => {
    window.history.replaceState(null, '', '/disenar?x=1#y')
    render(<Prueba titulo="t" />)
    expect(canonical()).toBe(`${window.location.origin}/disenar`)
  })
})

describe('Metadatos de cada página', () => {
  it('inicio, diseñar y privacidad se indexan, con título y descripción propios', () => {
    expect(PAGINAS_INDEXABLES).toEqual(['inicio', 'disenar', 'privacidad'])
    for (const pagina of PAGINAS_INDEXABLES) {
      const r = render(<Metadatos pagina={pagina} />)
      expect(document.title).toBe(textos.seo[pagina].titulo)
      expect(descripcion()).toBe(textos.seo[pagina].descripcion)
      expect(robots()).toBeUndefined()
      r.unmount()
    }
  })

  it('las páginas de cuenta no se indexan', () => {
    for (const pagina of ['entrar', 'registro', 'confirmar', 'olvido', 'restablecer', 'cuenta'] as const) {
      const r = render(<Metadatos pagina={pagina} />)
      expect(document.title).toBe(textos.seo[pagina].titulo)
      expect(robots()).toBe('noindex')
      r.unmount()
    }
  })

  it('los títulos y descripciones caben en lo que enseña un buscador', () => {
    for (const t of Object.values(textos.seo)) {
      expect(t.titulo.length).toBeLessThanOrEqual(60)
      if ('descripcion' in t) expect(t.descripcion.length).toBeLessThanOrEqual(160)
    }
  })
})
