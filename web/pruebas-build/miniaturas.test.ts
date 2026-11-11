import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// No depende de dist: las miniaturas viven en public/ y su manifiesto en src (se lee como texto: este proyecto de
// TypeScript no importa de src). Que cada tipo tenga la suya y al día lo vigila src/editor/paneles/miniaturas.test.ts.
const carpeta = new URL('../public/miniaturas/', import.meta.url)
const manifiesto = readFileSync(new URL('../src/editor/paneles/miniaturas.generado.ts', import.meta.url), 'utf8')
const ids = [...manifiesto.matchAll(/^ {2}'([a-z0-9-]+)': \{ firma: '[0-9a-f]{8}', contenido: '([0-9a-f]{8})', ancho: (\d+), alto: (\d+) \},$/gm)]
  .map((m) => ({ id: m[1]!, contenido: m[2]!, ancho: Number(m[3]), alto: Number(m[4]) }))
const ficheros = readdirSync(carpeta)
const REGENERAR = 'regenera con npm run miniaturas'

// Medido el 10 nov 2026 (plan 30): 59 miniaturas, 142,3 kB. Tope: lo medido + 15 %, como en presupuesto.test.ts.
// Si se pasa, no es «subir el tope»: es mirar qué miniatura ha crecido o si ha cambiado la calidad del WebP.
const TOPE_KB = 164

describe('ficheros de las miniaturas 3D (public/miniaturas)', () => {
  it('hay un WebP por entrada del manifiesto y ninguno más', () => {
    expect(ids.length).toBeGreaterThan(50)
    expect([...ficheros].sort(), REGENERAR).toEqual(ids.map((m) => `${m.id}.webp`).sort())
  })

  it('el resumen de cada imagen (el ?v= de su URL) es el de sus bytes: una imagen regenerada nunca sale de una caché vieja', () => {
    for (const m of ids) {
      const bytes = readFileSync(new URL(`${m.id}.webp`, carpeta))
      expect(createHash('sha256').update(bytes).digest('hex').slice(0, 8), `${m.id}: ${REGENERAR}`).toBe(m.contenido)
    }
  })

  it('cada imagen cabe en 320 × 112 (el doble de la franja de la tarjeta en móvil)', () => {
    for (const m of ids) {
      expect(m.ancho, m.id).toBeLessThanOrEqual(320)
      expect(m.alto, m.id).toBeLessThanOrEqual(112)
      expect(Math.max(m.ancho, m.alto), m.id).toBeGreaterThanOrEqual(8)
    }
  })

  it(`todas juntas pesan como mucho ${TOPE_KB} kB`, () => {
    const total = ficheros.reduce((s, f) => s + statSync(new URL(f, carpeta)).size, 0) / 1000
    expect(total).toBeLessThanOrEqual(TOPE_KB)
  })
})
