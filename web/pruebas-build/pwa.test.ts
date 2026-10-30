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
  })

  it('genera el service worker y precarga el fragmento 3D', () => {
    expect(hay('sw.js')).toBe(true)
    const sw = readFileSync(new URL('sw.js', dist), 'utf8')
    const fragmentos = readdirSync(new URL('assets/', dist)).filter((f) => f.endsWith('.js'))
    expect(fragmentos.length).toBeGreaterThan(1)
    for (const f of fragmentos) expect(sw).toContain(f)
  })
})
