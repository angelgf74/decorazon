import { describe, expect, it } from 'vitest'
import { ajustarMedidas, elementoNuevo } from './elemento'
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
