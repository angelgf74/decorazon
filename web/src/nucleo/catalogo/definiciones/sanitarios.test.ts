import { describe, expect, it } from 'vitest'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { cajaDePieza } from '../../modelo3d/formas'
import { catalogoBase } from '../catalogoBase'
import { elemento } from './ayuda.test-util'

type Revolucion = Extract<PiezaLocal, { forma: 'revolucion' }>
const piezas = (tipo: string, variantes = {}) => catalogoBase.get(tipo)!.modelo3d!(elemento(tipo, 0, 0, 0, {}, variantes))
const revoluciones = (ps: PiezaLocal[]) => ps.filter((p): p is Revolucion => p.forma === 'revolucion')
const radioEn = (p: Revolucion, z: number) => Math.max(...p.perfil.filter(([, pz]) => pz === z).map(([r]) => r))
/** La taza: la revolución de loza sin color propio que arranca en el suelo. */
const tazaDe = (ps: PiezaLocal[]) => revoluciones(ps).find((p) => p.color === undefined && Math.min(...p.perfil.map(([, z]) => z)) === 0)!

describe('inodoro en 3D', () => {
  it('la taza es una revolución ovalada (más larga que ancha) que se estrecha hacia el pie y llega al borde a 38', () => {
    const taza = tazaDe(piezas('inodoro'))
    expect(taza).toBeDefined()
    expect(taza.escalaY).toBeGreaterThan(1)
    expect(radioEn(taza, 0)).toBeLessThan(Math.max(...taza.perfil.map(([r]) => r)))
    expect(Math.max(...taza.perfil.map(([, z]) => z))).toBe(38)
    // Hueca: el perfil vuelve al eje por debajo del borde (el fondo de la cubeta).
    expect(taza.perfil.at(-1)![0]).toBe(0)
    expect(taza.perfil.at(-1)![1]).toBeLessThan(38)
  })

  it('el aro del asiento es una revolución anular sobre el borde, de 38 a 40, con el mismo óvalo que la taza', () => {
    const ps = piezas('inodoro')
    const taza = tazaDe(ps)
    const aro = revoluciones(ps).find((p) => Math.min(...p.perfil.map(([, z]) => z)) === 38)
    expect(aro).toBeDefined()
    expect(Math.min(...aro!.perfil.map(([r]) => r))).toBeGreaterThan(0)
    expect(Math.max(...aro!.perfil.map(([, z]) => z))).toBe(40)
    expect([aro!.cx, aro!.cy, aro!.escalaY]).toEqual([taza.cx, taza.cy, taza.escalaY])
  })

  it('el cuerpo que une la taza con la pared no asoma dentro de la cubeta: queda por debajo de su fondo (media altura)', () => {
    const ps = piezas('inodoro')
    const fondoCubeta = tazaDe(ps).perfil.at(-1)![1]
    for (const c of ps.filter((p) => p.forma === 'caja' && p.z0 === 0)) expect(cajaDePieza(c).z1).toBeLessThan(fondoCubeta)
  })

  it('dentro, el agua: una lámina más oscura que la loza', () => {
    const agua = revoluciones(piezas('inodoro')).find((p) => p.color !== undefined)
    expect(agua).toBeDefined()
    expect(agua!.color).not.toBe('#f4f4f2')
  })

  it('con la cisterna vista, una caja redondeada de 18 de fondo de 40 al alto; sin ella, nada pasa de 40', () => {
    const cisterna = piezas('inodoro').find((p) => p.forma === 'caja' && p.z0 === 40)
    expect(cisterna).toMatchObject({ y0: -33, y1: -15, z1: 78, radio: 2 })
    for (const p of piezas('inodoro', { cisterna: false })) expect(cajaDePieza(p).z1).toBeLessThanOrEqual(40)
  })
})

describe('bidé en 3D', () => {
  it('la misma taza ovalada hasta el borde (el alto), sin asiento, con el fondo más oscuro', () => {
    const ps = piezas('bide')
    const taza = tazaDe(ps)
    expect(taza.escalaY).toBeGreaterThan(1)
    expect(Math.max(...taza.perfil.map(([, z]) => z))).toBe(40)
    expect(revoluciones(ps).filter((p) => Math.min(...p.perfil.map(([r]) => r)) > 0)).toHaveLength(0)
    expect(revoluciones(ps).some((p) => p.color !== undefined)).toBe(true)
  })
})
