import { describe, expect, it } from 'vitest'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { cajaDePieza } from '../../modelo3d/formas'
import { planta } from './planta'
import { elemento } from './ayuda.test-util'

type Revolucion = Extract<PiezaLocal, { forma: 'revolucion' }>
const piezas = (medidas = {}) => planta.modelo3d!(elemento('planta', 0, 0, 0, medidas))
const revoluciones = (ps: PiezaLocal[], zona: string) => ps.filter((p): p is Revolucion => p.forma === 'revolucion' && p.zona === zona && p.color === undefined)

describe('planta en 3D', () => {
  it('la maceta es de revolución: más estrecha abajo que en la boca, con un borde que sale y el interior hundido', () => {
    const [maceta] = revoluciones(piezas(), 'maceta')
    expect(maceta).toBeDefined()
    const p = maceta!.perfil
    const zArriba = Math.max(...p.map(([, z]) => z))
    const radioAbajo = Math.max(...p.filter(([, z]) => z === 0).map(([r]) => r))
    const radioBorde = Math.max(...p.map(([r]) => r))
    expect(radioAbajo).toBeLessThan(radioBorde)
    expect(p.filter(([r, z]) => z === zArriba && r === radioBorde)).toHaveLength(1)
    // Acaba en el eje por debajo del borde: el fondo de dentro, donde va la tierra.
    expect(p.at(-1)![0]).toBe(0)
    expect(p.at(-1)![1]).toBeLessThan(zArriba)
  })

  it('lleva tierra oscura dentro de la boca y un tronco que sube de la tierra a la copa', () => {
    const ps = piezas()
    const tierra = ps.find((p) => p.forma === 'cilindro' && p.material === 'tela')
    const tronco = ps.find((p) => p.forma === 'cilindro' && p.material === 'madera')
    expect(tierra).toBeDefined()
    expect(tronco).toBeDefined()
    const hojas = revoluciones(ps, 'hojas')
    const zCopa = Math.min(...hojas.map((h) => cajaDePieza(h).z0))
    expect(cajaDePieza(tronco!).z0).toBeLessThan(cajaDePieza(tierra!).z1)
    expect(cajaDePieza(tronco!).z1).toBeGreaterThan(zCopa)
  })

  it('la copa son varias matas redondeadas (elipsoides) que llegan arriba del todo', () => {
    const hojas = revoluciones(piezas(), 'hojas')
    expect(hojas.length).toBeGreaterThanOrEqual(4)
    expect(Math.max(...hojas.map((h) => cajaDePieza(h).z1))).toBeCloseTo(100)
    for (const h of hojas) {
      expect(h.perfil[0]![0]).toBe(0)
      expect(h.perfil.at(-1)![0]).toBe(0)
    }
  })

  it('una planta alta y estrecha lleva más pisos de matas que una baja y ancha', () => {
    const alta = revoluciones(piezas({ ancho: 30, fondo: 30, alto: 180 }), 'hojas')
    const baja = revoluciones(piezas({ ancho: 60, fondo: 60, alto: 50 }), 'hojas')
    expect(alta.length).toBeGreaterThan(baja.length)
  })
})
