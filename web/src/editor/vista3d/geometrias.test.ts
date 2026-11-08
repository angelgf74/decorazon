import { BoxGeometry, CylinderGeometry, type BufferGeometry } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { describe, expect, it } from 'vitest'
import { geometriaReceptor, uvsEnMetros } from './geometrias'

/** Ancho y alto de las coordenadas de textura de los vértices cuya normal es `n`. */
function rangoUV(g: BufferGeometry, n: [number, number, number]): [number, number] {
  const normal = g.getAttribute('normal')
  const uv = g.getAttribute('uv')
  const us: number[] = []
  const vs: number[] = []
  for (let i = 0; i < normal.count; i++) {
    if (Math.abs(normal.getX(i) - n[0]) + Math.abs(normal.getY(i) - n[1]) + Math.abs(normal.getZ(i) - n[2]) < 1e-6) {
      us.push(uv.getX(i))
      vs.push(uv.getY(i))
    }
  }
  return [Math.max(...us) - Math.min(...us), Math.max(...vs) - Math.min(...vs)]
}

describe('geometriaReceptor', () => {
  it('es la planta (cm) en el plano local del receptor de drei, relativa al centro, con uv de 0 a 1 sobre su caja', () => {
    const g = geometriaReceptor([{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 330 }, { x: 0, y: 330 }], [2, 0, 1.65])
    g.computeBoundingBox()
    const b = g.boundingBox!
    // Local (x, −z): la planta de 4 × 3,3 m centrada queda de −2 a 2 y de −1,65 a 1,65, en z = 0.
    expect([b.min.x, b.max.x, b.min.y, b.max.y, b.min.z, b.max.z].map((v) => Number(v.toFixed(6)))).toEqual([-2, 2, -1.65, 1.65, 0, 0])
    const uv = g.getAttribute('uv')
    const us = Array.from({ length: uv.count }, (_, i) => uv.getX(i))
    const vs = Array.from({ length: uv.count }, (_, i) => uv.getY(i))
    expect([Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)]).toEqual([0, 1, 0, 1])
  })
})

describe('uvsEnMetros', () => {
  it('una caja de 2 × 1 × 0,5 m: cada cara mide en la textura lo que mide de verdad', () => {
    const g = uvsEnMetros(new BoxGeometry(2, 1, 0.5))
    expect(rangoUV(g, [0, 0, 1])).toEqual([2, 1])
    expect(rangoUV(g, [1, 0, 0])).toEqual([0.5, 1])
    expect(rangoUV(g, [0, 1, 0])).toEqual([2, 0.5])
  })

  it('una caja redondeada también va en metros: en las zonas planas cada cara se proyecta sobre su plano', () => {
    const g = uvsEnMetros(new RoundedBoxGeometry(2, 1, 0.5, 3, 0.05))
    const posicion = g.getAttribute('position')
    const normal = g.getAttribute('normal')
    const uv = g.getAttribute('uv')
    expect(uv.count).toBe(posicion.count)
    let arriba = 0
    let frente = 0
    for (let i = 0; i < uv.count; i++) {
      if (Math.abs(normal.getY(i)) > 0.999) {
        arriba++
        expect(uv.getX(i)).toBeCloseTo(posicion.getX(i))
        expect(uv.getY(i)).toBeCloseTo(posicion.getZ(i))
      } else if (Math.abs(normal.getZ(i)) > 0.999) {
        frente++
        expect(uv.getX(i)).toBeCloseTo(posicion.getX(i))
        expect(uv.getY(i)).toBeCloseTo(posicion.getY(i))
      }
    }
    expect(arriba).toBeGreaterThan(0)
    expect(frente).toBeGreaterThan(0)
    // La parte plana de arriba mide lo que la caja menos los dos radios.
    expect(rangoUV(g, [0, 1, 0])).toEqual([2 - 0.1, 0.5 - 0.1].map((v) => expect.closeTo(v, 6)))
  })

  it('el lateral de un cilindro da la vuelta en metros (2πr) y sube su altura', () => {
    const r = 0.2
    const g = uvsEnMetros(new CylinderGeometry(r, r, 0.8, 24), { cilindro: r })
    const uv = g.getAttribute('uv')
    let maxU = 0
    let maxV = 0
    // El lateral va primero en CylinderGeometry: (24 + 1) × 2 vértices.
    for (let i = 0; i < 50; i++) {
      maxU = Math.max(maxU, uv.getX(i))
      maxV = Math.max(maxV, uv.getY(i))
    }
    expect(maxU).toBeCloseTo(2 * Math.PI * r)
    expect(maxV).toBeCloseTo(0.8)
  })
})
