import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const dist = new URL('../dist/', import.meta.url)
const leer = (f: string) => readFileSync(new URL(f, dist), 'utf8')
const DOMINIO = 'https://decorazon.angelgf.com.es'

// Como presupuesto.test.ts: sin dist se salta salvo con EXIGIR_DIST=1 (el paso del CI tras compilar).
describe.skipIf(!existsSync(new URL('index.html', dist)) && !process.env.EXIGIR_DIST)('SEO en dist', () => {
  it('sitemap.xml es XML con las cuatro páginas públicas y nada privado', () => {
    const xml = leer('sitemap.xml')
    expect(xml.startsWith('<?xml')).toBe(true)
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(urls).toEqual([`${DOMINIO}/`, `${DOMINIO}/disenar`, `${DOMINIO}/como-funciona`, `${DOMINIO}/privacidad`])
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
    expect(html).toContain(`<meta property="og:image" content="${DOMINIO}/imagen-redes.png"`)
    expect(html).toContain('<meta property="og:image:width" content="1200"')
    expect(html).toContain('<meta property="og:image:height" content="630"')
    expect(html).toContain('<meta property="og:title"')
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image"')
    expect(html).toContain(`<link rel="canonical" href="${DOMINIO}/"`)
    const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
    expect(ld).not.toBeNull()
    const datos = JSON.parse(ld![1]!)
    expect(datos).toMatchObject({ '@context': 'https://schema.org', '@type': 'WebApplication', url: `${DOMINIO}/`, inLanguage: 'es' })
    expect(datos.offers).toMatchObject({ price: '0' })
  })

  it('la imagen para redes es un PNG de 1200 × 630 (1,91:1, la que no recortan WhatsApp, X ni Facebook)', () => {
    const png = readFileSync(new URL('imagen-redes.png', dist))
    expect(png.subarray(1, 4).toString('latin1')).toBe('PNG')
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630])
    // Por debajo de 300 kB: WhatsApp no enseña la vista previa con imágenes grandes.
    expect(png.length).toBeLessThan(300 * 1024)
  })

  it('las capturas de «Cómo funciona» son WebP y no pesan de más (que carguen lo comprueba e2e/como-funciona.spec.ts)', () => {
    const carpeta = new URL('como-funciona/', dist)
    const ficheros = readdirSync(carpeta)
    expect(ficheros.length).toBeGreaterThanOrEqual(5)
    for (const f of ficheros) {
      const imagen = readFileSync(new URL(f, carpeta))
      expect(imagen.subarray(8, 12).toString('latin1')).toBe('WEBP')
      expect(imagen.length).toBeLessThan(150 * 1024)
    }
  })

  it('el service worker no sirve la aplicación en lugar de sitemap.xml ni robots.txt', () => {
    const sw = leer('sw.js')
    expect(sw).toMatch(/sitemap/)
    expect(sw).toMatch(/robots/)
  })
})
