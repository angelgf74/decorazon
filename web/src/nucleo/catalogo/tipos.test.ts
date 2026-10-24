import { describe, expect, it } from 'vitest'
import { capitalizar, conArticulo, deArticulo } from './tipos'
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
