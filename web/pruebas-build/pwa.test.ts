import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const dist = new URL('../dist/', import.meta.url)
const hay = (f: string) => existsSync(new URL(f, dist))

// Solo tiene sentido tras `npm run build`; sin dist se salta.
describe.skipIf(!hay('index.html'))('PWA en dist', () => {
  it('genera el manifiesto con el color del tema y los iconos', () => {
    const m = JSON.parse(readFileSync(new URL('manifest.webmanifest', dist), 'utf8'))
    expect(m.theme_color).toBe('#B9473A')
    expect(m.display).toBe('standalone')
    expect(m.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)
    for (const i of m.icons as { src: string }[]) expect(hay(i.src.slice(1))).toBe(true)
  })

  it('genera el service worker y precarga el fragmento 3D', () => {
    expect(hay('sw.js')).toBe(true)
    const sw = readFileSync(new URL('sw.js', dist), 'utf8')
    const fragmentos = readdirSync(new URL('assets/', dist)).filter((f) => f.endsWith('.js'))
    expect(fragmentos.length).toBeGreaterThan(1)
    for (const f of fragmentos) expect(sw).toContain(f)
  })

  it('registra el service worker desde index.html', () => {
    expect(readFileSync(new URL('index.html', dist), 'utf8')).toContain('registerSW.js')
  })

  it('no cachea respuestas de la API en tiempo de ejecución: la única ruta con caché es la de las miniaturas del catálogo', () => {
    const sw = readFileSync(new URL('sw.js', dist), 'utf8')
    const estrategias = [...sw.matchAll(/new \w+\.(NetworkFirst|CacheFirst|StaleWhileRevalidate|NetworkOnly)\(/g)].map((m) => m[1])
    expect(estrategias).toEqual(['CacheFirst'])
    // Una RegExp de workbox solo vale para otro origen si coincide desde el principio de la URL: esta no puede tocar la API.
    const ruta = String.raw`registerRoute(/\/miniaturas\/[^/]+\.webp/,new `
    expect(sw).toContain(ruta)
    expect(sw.slice(sw.indexOf(ruta))).toMatch(/^registerRoute\([^,]+,new \w+\.CacheFirst\(\{cacheName:"miniaturas"/)
  })
})
