import { existsSync, readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const dist = new URL('../dist/', import.meta.url)
const hay = (f: string) => existsSync(new URL(f, dist))
const kB = (f: string) => statSync(new URL(f, dist)).size / 1024

// Medido el 7 nov 2026 (fase 8, plan 20): arranque 535 kB (index 425 + jsx-runtime 110 + runtime 1), CSS 42 kB,
// fragmento 3D 1015 kB. Tope: lo medido + 15 %. Si se pasa, no es «subir el tope»: es mirar qué entró en el arranque.
const PRESUPUESTO_ARRANQUE_KB = 620
const PRESUPUESTO_CSS_KB = 48
const PRESUPUESTO_3D_KB = 1170

/** Los .js y .css que index.html carga al arrancar: script, modulepreload y stylesheet. */
function arranque() {
  const html = readFileSync(new URL('index.html', dist), 'utf8')
  const js = [...html.matchAll(/<(?:script[^>]*src|link rel="modulepreload"[^>]*href)="\/([^"]+\.js)"/g)].map((m) => m[1]!)
  const css = [...html.matchAll(/<link rel="stylesheet"[^>]*href="\/([^"]+\.css)"/g)].map((m) => m[1]!)
  return { html, js, css }
}

// Solo tiene sentido tras `npm run build`; sin dist se salta.
describe.skipIf(!hay('index.html'))('presupuesto de arranque en dist', () => {
  it('index.html no carga ni precarga el fragmento 3D: three solo entra al pulsar 3D', () => {
    const { html, js } = arranque()
    expect(js.length).toBeGreaterThan(0)
    expect(html).not.toMatch(/Escena3D-/)
    expect(js.some((f) => /Escena3D-/.test(f))).toBe(false)
  })

  it(`el JavaScript del arranque pesa como mucho ${PRESUPUESTO_ARRANQUE_KB} kB sin comprimir`, () => {
    const { js } = arranque()
    const total = js.filter((f) => f.startsWith('assets/')).reduce((s, f) => s + kB(f), 0)
    expect(total).toBeGreaterThan(100)
    expect(total).toBeLessThanOrEqual(PRESUPUESTO_ARRANQUE_KB)
  })

  it(`el CSS del arranque pesa como mucho ${PRESUPUESTO_CSS_KB} kB`, () => {
    const { css } = arranque()
    expect(css).toHaveLength(1)
    expect(kB(css[0]!)).toBeLessThanOrEqual(PRESUPUESTO_CSS_KB)
  })

  it(`el fragmento 3D pesa como mucho ${PRESUPUESTO_3D_KB} kB`, () => {
    const html = readFileSync(new URL('sw.js', dist), 'utf8')
    const fragmento = html.match(/assets\/Escena3D-[^"']+\.js/)?.[0]
    expect(fragmento).toBeDefined()
    expect(kB(fragmento!)).toBeLessThanOrEqual(PRESUPUESTO_3D_KB)
  })

  it('index.html lleva la descripción para los buscadores y hay un robots.txt de verdad (sin él, nginx devuelve index.html)', () => {
    const { html } = arranque()
    expect(html).toMatch(/<meta name="description" content="[^"]{40,}"/)
    expect(hay('robots.txt')).toBe(true)
    const robots = readFileSync(new URL('robots.txt', dist), 'utf8')
    expect(robots).toMatch(/^User-agent: \*/m)
    expect(robots).toMatch(/^Disallow: \/compartido\//m)
  })
})
