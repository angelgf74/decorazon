import { describe, expect, it } from 'vitest'
import { capitalizar, conArticulo, deArticulo, valorVariante } from './tipos'
import { armario } from './definiciones/armario'
import { catalogoBase } from './catalogoBase'
import { aMundo } from './transformar'
import { elementoDe } from './definiciones/ayuda.test-util'

describe('artículos', () => {
  it('conArticulo / deArticulo / capitalizar', () => {
    expect(conArticulo('armario', 'm')).toBe('el armario')
    expect(conArticulo('cama', 'f')).toBe('la cama')
    expect(deArticulo('cómoda', 'f')).toBe('de la cómoda')
    expect(deArticulo('armario', 'm')).toBe('del armario')
    expect(capitalizar('la puerta')).toBe('La puerta')
  })
})
describe('catálogo base y aMundo', () => {
  it('tiene los cuatro tipos', () => {
    expect([...catalogoBase.keys()].sort()).toEqual(['alfombra', 'armario', 'cama', 'comoda'])
  })
  it('aMundo rota en horario', () => {
    const p = aMundo(elementoDe('x', 10, 10, 90, 10, 10, 10), { x: 0, y: 5 })
    expect(p.x).toBeCloseTo(5, 9)
    expect(p.y).toBeCloseTo(10, 9)
  })
})
describe('valorVariante', () => {
  const con = (variantes: Record<string, string | number | boolean>) => elementoDe('armario', 0, 0, 0, 100, 60, 220, variantes)
  it('valor válido', () => {
    expect(valorVariante(armario, con({ modulos: 3 }), 'modulos')).toBe(3)
    expect(valorVariante(armario, con({ puertas: 'correderas' }), 'puertas')).toBe('correderas')
  })
  it('valor que no está en la definición: defecto', () => {
    expect(valorVariante(armario, con({ modulos: 0 }), 'modulos')).toBe(1)
    expect(valorVariante(armario, con({ modulos: 'abc' }), 'modulos')).toBe(1)
    expect(valorVariante(armario, con({ puertas: 'Abatibles' }), 'puertas')).toBe('abatibles')
  })
  it('variante desconocida lanza', () => {
    expect(() => valorVariante(armario, con({}), 'nada')).toThrow()
  })
})
