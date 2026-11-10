import { describe, expect, it } from 'vitest'
import { cajaDePieza, contornoEncogido } from './formas'

describe('cajaDePieza: la caja local (cm) que envuelve cualquier pieza', () => {
  it('una caja es ella misma', () => {
    expect(cajaDePieza({ forma: 'caja', x0: -10, y0: -5, z0: 2, x1: 10, y1: 5, z1: 30, zona: 'z' })).toEqual({ x0: -10, y0: -5, z0: 2, x1: 10, y1: 5, z1: 30 })
  })

  it('un cilindro, su radio alrededor del centro', () => {
    expect(cajaDePieza({ forma: 'cilindro', cx: 3, cy: -2, r: 4, z0: 0, z1: 9, zona: 'z' })).toEqual({ x0: -1, y0: -6, z0: 0, x1: 7, y1: 2, z1: 9 })
  })

  it('una revolución de 4 lados es una pirámide con las caras alineadas con los ejes: el radio llega a las esquinas', () => {
    const c = cajaDePieza({ forma: 'revolucion', cx: 5, cy: 0, perfil: [[0, 0], [20 * Math.SQRT2, 0], [10, 30], [0, 30]], lados: 4, zona: 'z' })
    expect(c.x0).toBeCloseTo(-15)
    expect(c.x1).toBeCloseTo(25)
    expect(c.y0).toBeCloseTo(-20)
    expect(c.y1).toBeCloseTo(20)
    expect([c.z0, c.z1]).toEqual([0, 30])
  })

  it('una revolución redonda (24 lados por defecto) no pasa del radio mayor del perfil, y `escalaY` la estira a lo fondo', () => {
    const c = cajaDePieza({ forma: 'revolucion', cx: 0, cy: 10, perfil: [[0, 5], [20, 5], [12, 40], [0, 40]], escalaY: 0.5, zona: 'z' })
    expect(c.x1).toBeLessThanOrEqual(20)
    expect(c.x1).toBeGreaterThan(20 * Math.cos(Math.PI / 24) - 1e-9)
    expect(c.x0).toBeCloseTo(-c.x1)
    expect(c.y1 - 10).toBeLessThanOrEqual(10)
    expect(c.y1 - 10).toBeGreaterThan(10 * Math.cos(Math.PI / 24) - 1e-9)
    expect(c.y0 - 10).toBeCloseTo(-(c.y1 - 10))
    expect([c.z0, c.z1]).toEqual([5, 40])
  })

  it('una extrusión en planta: el contorno es (x, y) y va de `desde` a `hasta` en z', () => {
    expect(cajaDePieza({ forma: 'extrusion', plano: 'planta', contorno: [[-10, -5], [10, -5], [0, 8]], desde: 2, hasta: 6, zona: 'z' }))
      .toEqual({ x0: -10, y0: -5, z0: 2, x1: 10, y1: 8, z1: 6 })
  })

  it('una extrusión en alzado: el contorno es (x, z) y va de `desde` a `hasta` en y', () => {
    expect(cajaDePieza({ forma: 'extrusion', plano: 'alzado', contorno: [[-10, 0], [10, 0], [10, 40]], desde: -3, hasta: 3, zona: 'z' }))
      .toEqual({ x0: -10, y0: -3, z0: 0, x1: 10, y1: 3, z1: 40 })
  })

  it('una extrusión de perfil: el contorno es (y, z) y va de `desde` a `hasta` en x', () => {
    expect(cajaDePieza({ forma: 'extrusion', plano: 'perfil', contorno: [[-5, 0], [5, 0], [5, 30]], desde: -20, hasta: 20, zona: 'z' }))
      .toEqual({ x0: -20, y0: -5, z0: 0, x1: 20, y1: 5, z1: 30 })
  })

  it('un tubo recto termina en un disco perpendicular a su dirección: una pata vertical desde el suelo no baja de z = 0', () => {
    expect(cajaDePieza({ forma: 'tubo', puntos: [[0, 0, 0], [0, 0, 40]], r: 2, zona: 'z' })).toEqual({ x0: -2, y0: -2, z0: 0, x1: 2, y1: 2, z1: 40 })
  })

  it('un tubo inclinado: en cada eje, el disco del extremo ocupa r·√(1 − d²) (d, la componente de su dirección en ese eje)', () => {
    const c = cajaDePieza({ forma: 'tubo', puntos: [[0, 0, 0], [30, 0, 40]], r: 2, zona: 'z' })
    expect(c.x0).toBeCloseTo(-2 * 0.8)
    expect(c.z0).toBeCloseTo(-2 * 0.6)
    expect(c.x1).toBeCloseTo(30 + 2 * 0.8)
    expect(c.z1).toBeCloseTo(40 + 2 * 0.6)
    expect([c.y0, c.y1]).toEqual([-2, 2])
  })

  it('en un codo redondeado, la esquina cuenta el radio entero en todos los ejes (el codo queda dentro)', () => {
    const c = cajaDePieza({ forma: 'tubo', puntos: [[0, 0, 0], [0, 0, 40], [30, 0, 40]], r: 2, codo: 5, zona: 'z' })
    expect(c).toEqual({ x0: -2, y0: -2, z0: 0, x1: 30, y1: 2, z1: 42 })
  })

  it('cerrado, también el tramo del último al primero (aquí, la diagonal de vuelta ocupa r·√½ en x e y)', () => {
    const c = cajaDePieza({ forma: 'tubo', puntos: [[0, 0, 10], [20, 0, 10], [20, 20, 10]], r: 1, cerrado: true, zona: 'z' })
    const m = Math.SQRT1_2
    expect([c.x0, c.y0, c.z0, c.x1, c.y1, c.z1].map((v) => Number(v.toFixed(9)))).toEqual([-m, -1, 9, 21, 20 + m, 11].map((v) => Number(v.toFixed(9))))
  })
})

describe('contornoEncogido: el contorno metido d hacia dentro, se recorra en el sentido que se recorra', () => {
  const cuadrado: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]]
  const caja = (ps: [number, number][]) => [Math.min(...ps.map(([x]) => x)), Math.min(...ps.map(([, y]) => y)), Math.max(...ps.map(([x]) => x)), Math.max(...ps.map(([, y]) => y))].map((v) => Number(v.toFixed(9)))

  it('un cuadrado de 10 encogido 2 es uno de 6 centrado, en los dos sentidos', () => {
    expect(caja(contornoEncogido(cuadrado, 2))).toEqual([2, 2, 8, 8])
    expect(caja(contornoEncogido([...cuadrado].reverse(), 2))).toEqual([2, 2, 8, 8])
  })
})

describe('cajaDePieza de una extrusión con radio', () => {
  it('los cantos redondeados no cambian la caja: el redondeo queda dentro del contorno', () => {
    expect(cajaDePieza({ forma: 'extrusion', plano: 'alzado', contorno: [[-10, 0], [10, 0], [10, 40], [-10, 40]], desde: -5, hasta: 5, radio: 2, zona: 'z' }))
      .toEqual({ x0: -10, y0: -5, z0: 0, x1: 10, y1: 5, z1: 40 })
  })
})
