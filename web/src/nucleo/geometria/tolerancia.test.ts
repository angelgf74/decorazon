import { describe, expect, it } from 'vitest'
import {
  TOLERANCIA_CM,
  cantidadMostrada,
  redondearAbajo,
  redondearArriba,
} from './tolerancia'

describe('tolerancia', () => {
  it('la tolerancia es 1 mm', () => {
    expect(TOLERANCIA_CM).toBe(0.1)
  })

  it('redondea hacia arriba ignorando ruido numérico', () => {
    expect(redondearArriba(12)).toBe(12)
    expect(redondearArriba(12.0000001)).toBe(12)
    expect(redondearArriba(11.2)).toBe(12)
  })

  it('redondea hacia abajo ignorando ruido numérico', () => {
    expect(redondearAbajo(44.9999999)).toBe(45)
    expect(redondearAbajo(45.7)).toBe(45)
  })

  it('la cantidad mostrada descuenta la tolerancia', () => {
    expect(cantidadMostrada(12.03)).toBe(12)
    expect(cantidadMostrada(11.2)).toBe(12)
    expect(cantidadMostrada(0.15)).toBe(1)
  })
})
