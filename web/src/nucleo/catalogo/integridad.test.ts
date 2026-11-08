import { describe, expect, it } from 'vitest'
import { catalogoBase } from './catalogoBase'
import { elementoNuevo, huellasEnPlanta } from './elemento'
import { cajaPlanta, superficie } from '../geometria/poligono'
import { documentoNuevo } from '../modelo/crear'
import { detectarConflictos } from '../conflictos/detectar'
import type { DefinicionTipo } from './tipos'

function combinaciones(def: DefinicionTipo): Record<string, string | number | boolean>[] {
  return def.variantes.reduce<Record<string, string | number | boolean>[]>(
    (acc, v) => acc.flatMap((c) => v.valores.map((valor) => ({ ...c, [v.clave]: valor }))),
    [{}],
  )
}

describe.each([...catalogoBase.entries()])('integridad de %s', (clave, def) => {
  it('clave, rangos, variantes y colores coherentes', () => {
    expect(clave).toBe(def.id)
    for (const r of [def.medidas.ancho, def.medidas.fondo, def.medidas.alto]) {
      expect(r.min).toBeLessThanOrEqual(r.defecto)
      expect(r.defecto).toBeLessThanOrEqual(r.max)
      for (const n of [r.min, r.defecto, r.max]) expect(Number.isInteger(n)).toBe(true)
    }
    for (const v of def.variantes) expect(v.valores).toContain(v.defecto)
    expect(def.zonasColor.length).toBeGreaterThan(0)
    for (const z of def.zonasColor) expect(z.defecto).toMatch(/^#[0-9a-f]{6}$/)
    expect(def.estancias.length).toBeGreaterThan(0)
  })
  it('cada combinación de variantes da volúmenes válidos', () => {
    for (const variantes of combinaciones(def)) {
      const e = { ...elementoNuevo(def, { x: 300, y: 300 }), variantes }
      const volumenes = def.volumenes(e)
      expect(volumenes.length).toBeGreaterThan(0)
      for (const v of volumenes) {
        expect(v.zMin).toBeGreaterThanOrEqual(0)
        expect(v.zMin).toBeLessThan(v.zMax)
      }
      expect(() => def.zonasApertura(e)).not.toThrow()
    }
  })
  it('solo en el centro de un salón de 600×600×260 no da conflictos', () => {
    const doc = documentoNuevo('salon', 600, 600, 260)
    doc.elementos = [elementoNuevo(def, { x: 300, y: 300 })]
    expect(detectarConflictos(doc, catalogoBase)).toEqual([])
  })
})

describe('integridad: medidas extra', () => {
  it('cada medida extra tiene un rango entero con min ≤ defecto ≤ max y clave única', () => {
    for (const def of catalogoBase.values()) {
      const claves = (def.medidasExtra ?? []).map((m) => m.clave)
      expect(new Set(claves).size).toBe(claves.length)
      for (const m of def.medidasExtra ?? []) {
        const { min, max, defecto } = m.rango
        expect([min, max, defecto].every(Number.isInteger)).toBe(true)
        expect(min <= defecto && defecto <= max).toBe(true)
      }
    }
  })
})

describe('integridad: miniatura del catálogo', () => {
  it('el elemento por defecto en (0, 0) tiene una huella con área y una caja finita (huellas y aperturas)', () => {
    for (const def of catalogoBase.values()) {
      const e = elementoNuevo(def, { x: 0, y: 0 }, `miniatura-${def.id}`)
      const huellas = huellasEnPlanta(def, e)
      expect(huellas.some((h) => superficie(h) > 0), def.id).toBe(true)
      const caja = cajaPlanta([...huellas, ...def.zonasApertura(e).map((z) => z.huella)].flat())
      for (const n of [caja.minX, caja.minY, caja.maxX, caja.maxY]) expect(Number.isFinite(n), def.id).toBe(true)
      expect(caja.maxX - caja.minX, def.id).toBeGreaterThan(0)
      expect(caja.maxY - caja.minY, def.id).toBeGreaterThan(0)
    }
  })
})

describe('materiales elegibles por zona (plan 28c)', () => {
  for (const def of catalogoBase.values()) {
    it(`${def.id}: si una zona ofrece materiales, incluye el suyo y son al menos dos`, () => {
      for (const z of def.zonasColor) {
        if (!z.materiales) continue
        expect(z.materiales, z.clave).toContain(z.material)
        expect(z.materiales.length, z.clave).toBeGreaterThanOrEqual(2)
        expect(new Set(z.materiales).size, z.clave).toBe(z.materiales.length)
      }
    })
  }
  it('las patas de las mesas, escritorios y sofás se pueden pedir en madera, metal o lacado', () => {
    for (const tipo of ['mesa', 'mesa-alta', 'mesa-reuniones', 'escritorio-l', 'sofa', 'sofa-cama', 'sofa-rinconera']) {
      const z = catalogoBase.get(tipo)!.zonasColor.find((z) => z.clave === 'patas')!
      expect(z.materiales, tipo).toEqual(expect.arrayContaining(['madera', 'metal', 'lacado']))
    }
    expect(catalogoBase.get('mesa-auxiliar')!.zonasColor.find((z) => z.clave === 'pie')!.materiales).toEqual(expect.arrayContaining(['madera', 'metal', 'lacado']))
  })
})
