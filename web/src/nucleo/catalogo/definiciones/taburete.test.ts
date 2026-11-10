import { describe, expect, it } from 'vitest'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { cajaDePieza } from '../../modelo3d/formas'
import { taburete } from './taburete'
import { elemento } from './ayuda.test-util'

const piezas = (variantes = {}, medidas = {}) => taburete.modelo3d!(elemento('taburete', 0, 0, 0, medidas, variantes))
type Extrusion = Extract<PiezaLocal, { forma: 'extrusion' }>

describe('taburete en 3D', () => {
  it('el asiento es una extrusión en planta con las esquinas redondeadas, de 4 cm, arriba del todo', () => {
    const asiento = piezas().find((p): p is Extrusion => p.forma === 'extrusion')
    expect(asiento).toMatchObject({ plano: 'planta', desde: 71, hasta: 75, zona: 'asiento' })
    expect(cajaDePieza(asiento!)).toMatchObject({ x0: -17.5, x1: 17.5, y0: -17.5, y1: 17.5 })
    // Sin esquina viva.
    expect(asiento!.contorno.some(([x, y]) => Math.abs(x) === 17.5 && Math.abs(y) === 17.5)).toBe(false)
  })

  it('con patas redondas, el reposapiés es un aro de tubo cerrado por el centro de las patas, a un 30 % del alto', () => {
    const aro = piezas({ patas: 'redondas' }).find((p) => p.forma === 'tubo')
    expect(aro).toMatchObject({ cerrado: true, zona: 'asiento' })
    if (aro?.forma !== 'tubo') throw new Error('forma')
    expect(aro.puntos).toHaveLength(4)
    expect(aro.puntos.every(([, , z]) => z === Math.round(75 * 0.3))).toBe(true)
    // El centro de las patas de 3 cm metidas 3 desde la esquina.
    expect(aro.puntos.map(([x, y]) => [Math.abs(x), Math.abs(y)])).toEqual(Array(4).fill([13, 13]))
  })

  it('con patas cuadradas, el reposapiés son cuatro listones entre las patas, a la misma altura', () => {
    const ps = piezas({ patas: 'cuadradas' })
    expect(ps.some((p) => p.forma === 'tubo')).toBe(false)
    const listones = ps.filter((p) => p.forma === 'caja' && p.z0 < 30 && p.z1 < 30 && p.z0 > 0)
    expect(listones).toHaveLength(4)
    for (const l of listones) expect((cajaDePieza(l).z0 + cajaDePieza(l).z1) / 2).toBe(Math.round(75 * 0.3))
  })
})
