import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const dist = new URL('../dist/', import.meta.url)
const leer = (f: string) => readFileSync(new URL(f, dist), 'utf8')
const DOMINIO = 'https://decorazon.angelgf.com.es'

// Como presupuesto.test.ts: sin dist se salta salvo con EXIGIR_DIST=1 (el paso del CI tras compilar).
describe.skipIf(!existsSync(new URL('index.html', dist)) && !process.env.EXIGIR_DIST)('SEO en dist', () => {
  it('sitemap.xml es XML con las tres páginas públicas y nada privado', () => {
    const xml = leer('sitemap.xml')
    expect(xml.startsWith('<?xml')).toBe(true)
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(urls).toEqual([`${DOMINIO}/`, `${DOMINIO}/disenar`, `${DOMINIO}/privacidad`])
    // Etiquetas equilibradas: un XML mal cerrado no lo lee ningún buscador.
    expect(xml.match(/<url>/g)?.length).toBe(xml.match(/<\/url>/g)?.length)
  })

  it('robots.txt enlaza el sitemap y sigue cerrando lo privado', () => {
    const robots = leer('robots.txt')
    expect(robots).toContain(`Sitemap: ${DOMINIO}/sitemap.xml`)
    for (const r of ['/compartido/', '/cuenta', '/disenos']) expect(robots).toContain(`Disallow: ${r}`)
  })

  it('index.html lleva Open Graph con imagen absoluta, canonical y un JSON-LD que se parsea', () => {
    const html = leer('index.html')
    expect(html).toMatch(new RegExp(`<meta property="og:image" content="${DOMINIO}/ejemplos/[a-z]+[.]png"`))
    expect(html).toContain('<meta property="og:title"')
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image"')
    expect(html).toContain(`<link rel="canonical" href="${DOMINIO}/"`)
    const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
    expect(ld).not.toBeNull()
    const datos = JSON.parse(ld![1]!)
    expect(datos).toMatchObject({ '@context': 'https://schema.org', '@type': 'WebApplication', url: `${DOMINIO}/`, inLanguage: 'es' })
    expect(datos.offers).toMatchObject({ price: '0' })
  })

  it('el service worker no sirve la aplicación en lugar de sitemap.xml ni robots.txt', () => {
    const sw = leer('sw.js')
    expect(sw).toMatch(/sitemap/)
    expect(sw).toMatch(/robots/)
  })
})
