import { describe, expect, it } from 'vitest'
import { catalogoBase } from './catalogoBase'
import { documentoNuevo } from '../modelo/crear'
import { detectarConflictos } from '../conflictos/detectar'
import type { Elemento } from '../modelo/documento'
import { elemento } from './definiciones/ayuda.test-util'

const def = (id: string) => {
  const d = catalogoBase.get(id)
  if (!d) throw new Error(id)
  return d
}

function conflictos(...elementos: Elemento[]) {
  const doc = documentoNuevo('cocina', 600, 600, 260)
  doc.elementos = elementos
  return detectarConflictos(doc, catalogoBase)
}

describe('cocina', () => {
  it('módulo bajo: una puerta hasta 60 de ancho, dos por encima', () => {
    expect(def('modulo-bajo').zonasApertura(elemento('modulo-bajo', 0, 0, 0, { ancho: 60 }))).toHaveLength(1)
    expect(def('modulo-bajo').zonasApertura(elemento('modulo-bajo', 0, 0, 0, { ancho: 80 }))).toHaveLength(2)
  })
  it('módulo bajo con cajones: una zona "el cajón"', () => {
    const zonas = def('modulo-bajo').zonasApertura(elemento('modulo-bajo', 0, 0, 0, {}, { frente: 'cajones' }))
    expect(zonas.map((z) => z.nombre)).toEqual(['el cajón'])
  })
  it('módulo alto sobre módulo bajo en la misma huella: sin solape', () => {
    const c = conflictos(elemento('modulo-bajo', 300, 300, 0), elemento('modulo-alto', 300, 300, 0))
    expect(c.filter((x) => x.tipo === 'solape')).toEqual([])
  })
  it('placa sobre módulo bajo: sin solape', () => {
    const c = conflictos(elemento('modulo-bajo', 300, 300, 0), elemento('placa', 300, 300, 0))
    expect(c.filter((x) => x.tipo === 'solape')).toEqual([])
  })
  it('puerta del horno choca con una estantería a 30 cm, no con una mesa', () => {
    // frente +y: la columna ocupa y 270..330; el frente está en y = 330
    const columna = elemento('columna-cocina', 300, 300, 0)
    const estanteria = elemento('estanteria', 300, 330 + 30 + 15, 0, { fondo: 30 })
    expect(conflictos(columna, estanteria).some((x) => x.tipo === 'apertura')).toBe(true)
    const mesa = elemento('mesa', 300, 330 + 30 + 40, 0, { fondo: 80, alto: 75 })
    expect(conflictos(columna, mesa).some((x) => x.tipo === 'apertura')).toBe(false)
  })
})
