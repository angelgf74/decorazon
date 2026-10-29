import { describe, expect, it } from 'vitest'
import { catalogoBase } from './catalogoBase'
import { elementoNuevo } from './elemento'
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
