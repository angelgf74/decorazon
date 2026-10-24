import { describe, expect, it } from 'vitest'
import { distanciaConvexos, penetracion } from './convexo'
import { rectangulo } from './formas'
import { TOLERANCIA_CM } from './tolerancia'

const cuadrado = (x: number, y = 0) => rectangulo({ x, y }, 100, 100, 0)

describe('convexo', () => {
  it('penetración de cuadrados solapados 12', () => {
    expect(penetracion(cuadrado(0), cuadrado(88))).toBeCloseTo(12, 9)
  })
  it('independiente del sentido de los vértices', () => {
    expect(penetracion(cuadrado(0), [...cuadrado(88)].reverse())).toBeCloseTo(12, 9)
  })
  it('separados <= 0 y tocándose <= tolerancia', () => {
    expect(penetracion(cuadrado(0), cuadrado(105))).toBeLessThanOrEqual(0)
    expect(penetracion(cuadrado(0), cuadrado(100))).toBeLessThanOrEqual(TOLERANCIA_CM)
  })
  it('rectángulo rotado 90° pegado a otro', () => {
    const a = rectangulo({ x: 0, y: 0 }, 100, 60, 90) // ocupa x -30..30
    const b = rectangulo({ x: 60, y: 0 }, 60, 100, 0) // ocupa x 30..90
    expect(penetracion(a, b)).toBeLessThanOrEqual(TOLERANCIA_CM)
  })
  it('contención: caja 40×40 dentro de una 200×200 concéntrica -> 120 (lo que hay que moverla para separarlas)', () => {
    // Eje x: min(maxA - minB, maxB - minA) = min(20 - (-100), 100 - (-20)) = 120; igual en y.
    expect(penetracion(rectangulo({ x: 0, y: 0 }, 40, 40, 0), rectangulo({ x: 0, y: 0 }, 200, 200, 0))).toBeCloseTo(120, 9)
    expect(penetracion(rectangulo({ x: 0, y: 0 }, 200, 200, 0), rectangulo({ x: 0, y: 0 }, 40, 40, 0))).toBeCloseTo(120, 9)
  })
  it('distanciaConvexos', () => {
    expect(distanciaConvexos(cuadrado(0), cuadrado(145))).toBeCloseTo(45, 9)
    expect(distanciaConvexos(cuadrado(0), cuadrado(88))).toBe(0)
    expect(distanciaConvexos(cuadrado(0), cuadrado(100))).toBe(0)
  })
  it('distancia en diagonal entre esquinas', () => {
    expect(distanciaConvexos(cuadrado(0), cuadrado(130, 140))).toBeCloseTo(50, 9)
  })
})

describe('convexo oblicuo', () => {
  const rombo = (x: number) => rectangulo({ x, y: 0 }, 100, 100, 45)
  const base = rectangulo({ x: 0, y: 0 }, 100, 100, 0)
  it('rombo penetrando ~10', () => {
    expect(Math.abs(penetracion(base, rombo(50 + 70.71 - 10)) - 10)).toBeLessThanOrEqual(0.01)
  })
  it('rombo separado <= 0', () => {
    expect(penetracion(base, rombo(50 + 70.71 + 5))).toBeLessThanOrEqual(0)
  })
})
