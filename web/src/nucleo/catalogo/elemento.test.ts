import { describe, expect, it } from 'vitest'
import { ajustarMedidas, catalogoDeEstancia, elementoNuevo } from './elemento'
import { catalogoBase } from './catalogoBase'
import { armario } from './definiciones/armario'

describe('elementoNuevo', () => {
  it('toma medidas, variantes y colores por defecto', () => {
    const e = elementoNuevo(armario, { x: 10, y: 20 })
    expect(e.tipo).toBe('armario')
    expect(e.posicion).toEqual({ x: 10, y: 20 })
    expect(e.rotacion).toBe(0)
    expect(e.medidas).toEqual({ ancho: 100, fondo: 60, alto: 220 })
    expect(e.alturaSuelo).toBe(0)
    expect(e.variantes.puertas).toBe('abatibles')
    expect(e.variantes.modulos).toBe(1)
    expect(e.colores.cuerpo).toBe('#e8e4dc')
    expect(e.origen).toEqual({ tipo: 'generico' })
    expect(e.id).not.toBe('')
  })
  it('dos llamadas dan ids distintos', () => {
    expect(elementoNuevo(armario, { x: 0, y: 0 }).id).not.toBe(elementoNuevo(armario, { x: 0, y: 0 }).id)
  })
  it('acepta un id explícito', () => {
    expect(elementoNuevo(armario, { x: 0, y: 0 }, 'abc').id).toBe('abc')
  })
})

describe('ajustarMedidas', () => {
  it('redondea a entero y recorta a cada rango', () => {
    expect(ajustarMedidas(armario, { ancho: 9999, fondo: 10, alto: 150.6 })).toEqual({ ancho: 400, fondo: 35, alto: 151 })
  })
})

describe('catalogoDeEstancia', () => {
  const g = catalogoDeEstancia(catalogoBase, 'cocina')
  const ids = (l: { id: string }[]) => l.map((d) => d.id)
  it('separa los muebles de la estancia, el resto y la decoración', () => {
    expect(ids(g.deLaEstancia)).toEqual(expect.arrayContaining(['modulo-bajo', 'mesa', 'silla']))
    expect(ids(g.deLaEstancia)).not.toContain('cama')
    expect(ids(g.otros)).toContain('cama')
    expect(ids(g.decoracion)).toEqual(expect.arrayContaining(['alfombra', 'cortina']))
    expect(g.decoracion.every((d) => d.categoria === 'decoracion')).toBe(true)
  })
  it('cada grupo va ordenado por nombre', () => {
    for (const lista of [g.deLaEstancia, g.otros, g.decoracion]) {
      const nombres = lista.map((d) => d.nombre)
      expect(nombres).toEqual([...nombres].sort((a, b) => a.localeCompare(b, 'es')))
    }
  })
})
