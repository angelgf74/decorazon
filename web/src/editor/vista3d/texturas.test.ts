import { NoColorSpace, RepeatWrapping } from 'three'
import { describe, expect, it } from 'vitest'
import { LADO_TEXTURA, METROS_POR_MOSAICO, patronDe, texturaDe, type PatronTextura } from './texturas'

const PATRONES: PatronTextura[] = ['madera', 'tela', 'suelo', 'pared', 'baldosa']

const media = (a: Float32Array) => a.reduce((s, x) => s + x, 0) / a.length
/** Diferencia media entre dos columnas (o filas) del patrón. */
function salto(p: Float32Array, a: number, b: number, filas: boolean): number {
  let s = 0
  for (let k = 0; k < LADO_TEXTURA; k++) {
    s += filas ? Math.abs(p[a * LADO_TEXTURA + k]! - p[b * LADO_TEXTURA + k]!) : Math.abs(p[k * LADO_TEXTURA + a]! - p[k * LADO_TEXTURA + b]!)
  }
  return s / LADO_TEXTURA
}

describe('patronDe', () => {
  it.each(PATRONES)('%s: siempre el mismo, sin oscurecer el color elegido', (tipo) => {
    const p = patronDe(tipo)
    expect(p).toHaveLength(LADO_TEXTURA * LADO_TEXTURA)
    expect(patronDe(tipo)).toEqual(p)
    // Multiplica el color del usuario: de media casi blanco, para que el color siga siendo el que eligió.
    expect(media(p)).toBeGreaterThan(0.86)
    expect(Math.min(...p)).toBeGreaterThan(0.6)
    expect(Math.max(...p)).toBeLessThanOrEqual(1)
  })

  it.each(PATRONES)('%s: se repite sin costura (el borde no salta más que dentro del mosaico; las juntas de la tarima saltan a propósito)', (tipo) => {
    const p = patronDe(tipo)
    const ultimo = LADO_TEXTURA - 1
    for (const filas of [false, true]) {
      let vecinas = 0
      for (let k = 0; k < ultimo; k++) vecinas = Math.max(vecinas, salto(p, k, k + 1, filas))
      expect(salto(p, ultimo, 0, filas)).toBeLessThanOrEqual(vecinas + 0.005)
    }
  })

  it('cada patrón tiene relieve: no es un color plano', () => {
    for (const tipo of PATRONES) {
      const p = patronDe(tipo)
      expect(Math.max(...p) - Math.min(...p)).toBeGreaterThan(0.03)
    }
  })
})

describe('texturaDe', () => {
  it('madera, tela, suelo, baldosa y pared tienen textura repetible, en lineal y compartida', () => {
    for (const material of ['madera', 'tela', 'suelo', 'baldosa', 'pared'] as const) {
      const t = texturaDe(material)!
      expect(t).not.toBeNull()
      expect(t.wrapS).toBe(RepeatWrapping)
      expect(t.wrapT).toBe(RepeatWrapping)
      expect(t.colorSpace).toBe(NoColorSpace)
      expect(t.repeat.x).toBeCloseTo(1 / METROS_POR_MOSAICO[material])
      expect(texturaDe(material)).toBe(t)
    }
  })

  it('lacado, metal, cerámica y cristales siguen lisos', () => {
    for (const material of ['lacado', 'metal', 'ceramica', 'vidrio', 'cristal', 'mampara'] as const) expect(texturaDe(material)).toBeNull()
  })
})
