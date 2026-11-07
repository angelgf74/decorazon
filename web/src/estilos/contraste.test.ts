import { describe, expect, it } from 'vitest'
import css from './base.css?raw'

/** Los tokens `--nombre: #rgb` o `#rrggbb` de un bloque de CSS, siempre a seis cifras. */
function tokens(bloque: string): Record<string, string> {
  const seis = (h: string) => (h.length === 4 ? `#${[...h.slice(1)].map((c) => c + c).join('')}` : h)
  return Object.fromEntries([...bloque.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{3,6})\b/g)].map((m) => [m[1]!, seis(m[2]!).toLowerCase()]))
}

/** Luminancia relativa y relación de contraste de WCAG 2 (1.4.3 y 1.4.11). */
function luminancia(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!
}
function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (l1! + 0.05) / (l2! + 0.05)
}

const claro = tokens(css.slice(0, css.indexOf('@media (prefers-color-scheme: dark)')))
const oscuro = { ...claro, ...tokens(css.slice(css.indexOf('@media (prefers-color-scheme: dark)'))) }

/** Pares que se ven juntos: texto sobre fondo (4,5:1) y bordes de controles sobre fondo (3:1). */
const PARES: [string, string, number][] = [
  ['tinta', 'crema', 7], ['tinta', 'superficie', 7], ['tinta', 'crema-oscura', 4.5],
  ['gris', 'crema', 4.5], ['gris', 'superficie', 4.5],
  ['terracota', 'crema', 4.5], ['terracota', 'superficie', 4.5],
  ['sobre-terracota', 'primario', 4.5], ['sobre-tinta', 'tinta', 4.5],
  ['bien', 'crema', 4.5], ['bien', 'superficie', 4.5], ['peligro', 'crema', 4.5], ['peligro', 'superficie', 4.5],
  ['borde', 'crema', 3], ['borde', 'superficie', 3], ['amarillo', 'crema', 1.2],
  ['sobre-peligro', 'peligro', 4.5], ['conflicto', 'crema', 4.5], ['conflicto', 'superficie', 4.5],
]

describe.each([['claro', claro], ['oscuro', oscuro]] as const)('contraste del esquema %s', (_nombre, t) => {
  it('define todos los tokens que se comparan', () => {
    for (const [a, b] of PARES) {
      expect(t[a], a).toBeDefined()
      expect(t[b], b).toBeDefined()
    }
  })

  it.each(PARES)('%s sobre %s ≥ %s:1', (a, b, minimo) => {
    expect(contraste(t[a]!, t[b]!)).toBeGreaterThanOrEqual(minimo)
  })
})

describe('modo oscuro (M-29)', () => {
  it('sigue al sistema con prefers-color-scheme y declara color-scheme para los controles nativos', () => {
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)\s*{\s*:root\s*{[^}]*color-scheme: dark/)
  })

  it('en oscuro el fondo de página es oscuro y la tinta clara', () => {
    expect(luminancia(oscuro.crema!)).toBeLessThan(0.05)
    expect(luminancia(oscuro.tinta!)).toBeGreaterThan(0.7)
  })
})
