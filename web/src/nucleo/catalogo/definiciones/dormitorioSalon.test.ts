import { describe, expect, it } from 'vitest'
import { catalogoBase } from '../catalogoBase'
import { elemento } from './ayuda.test-util'

const def = (id: string) => {
  const d = catalogoBase.get(id)
  if (!d) throw new Error(id)
  return d
}

describe('dormitorio y salón', () => {
  it('los diez tipos nuevos están en el catálogo', () => {
    for (const id of ['mesita', 'escritorio', 'silla', 'estanteria', 'sofa', 'sillon', 'mesa-centro', 'mueble-tv', 'mesa', 'aparador']) {
      expect(catalogoBase.has(id)).toBe(true)
    }
  })
  it('mueble-tv con puertas 0: sin zonas de apertura; con 2, dos', () => {
    expect(def('mueble-tv').zonasApertura(elemento('mueble-tv', 0, 0, 0, {}, { puertas: 0 }))).toHaveLength(0)
    expect(def('mueble-tv').zonasApertura(elemento('mueble-tv', 0, 0, 0))).toHaveLength(2)
  })
  it('mesita con cajon false: sin zonas; por defecto, un cajón', () => {
    expect(def('mesita').zonasApertura(elemento('mesita', 0, 0, 0, {}, { cajon: false }))).toHaveLength(0)
    expect(def('mesita').zonasApertura(elemento('mesita', 0, 0, 0))).toHaveLength(1)
  })
  it('aparador: tantas puertas como la variante', () => {
    expect(def('aparador').zonasApertura(elemento('aparador', 0, 0, 0, {}, { puertas: 4 }))).toHaveLength(4)
  })
  it('categoría y altura editable', () => {
    expect(def('alfombra').categoria).toBe('decoracion')
    expect(def('alfombra').estancias).toEqual(['dormitorio', 'salon', 'cocina', 'despacho', 'bano'])
    expect(def('cama').categoria).toBe('mueble')
    expect(def('cama').alturaSueloEditable).toBe(false)
  })
})
