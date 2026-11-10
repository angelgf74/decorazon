import { describe, expect, it } from 'vitest'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { elemento } from './ayuda.test-util'
import { escritorioL } from './escritorioL'

type Caja = Extract<PiezaLocal, { forma: 'caja' }>
// Por defecto 160 × 140 × 75 con el ala a la derecha: tablero principal de y −70 a −10, extremo libre a la izquierda (x −80).
const el = (variantes = {}) => elemento('escritorio-l', 0, 0, 0, {}, variantes)
const xs = (huella: { x: number }[]) => [Math.min(...huella.map((p) => p.x)), Math.max(...huella.map((p) => p.x))]
const ys = (huella: { y: number }[]) => [Math.min(...huella.map((p) => p.y)), Math.max(...huella.map((p) => p.y))]

describe('escritorio en L: cajonera en el extremo libre del tablero principal', () => {
  it('por defecto sin cajonera: dos tableros y cinco patas, sin aperturas', () => {
    expect(escritorioL.volumenes(el())).toHaveLength(7)
    expect(escritorioL.zonasApertura(el())).toEqual([])
  })

  it('con cajonera y el ala a la derecha: bloque de 40 en el extremo izquierdo del tablero principal, tres patas, un cajón que abre hacia delante', () => {
    const e = el({ cajonera: true })
    const vols = escritorioL.volumenes(e)
    expect(vols).toHaveLength(6)
    const bloque = vols.find((v) => xs(v.huella)[1]! - xs(v.huella)[0]! === 40)!
    expect(xs(bloque.huella)).toEqual([-80, -40])
    expect(ys(bloque.huella)).toEqual([-70, -10])
    expect([bloque.zMin, bloque.zMax]).toEqual([0, 72])
    expect(vols.filter((v) => xs(v.huella)[1]! - xs(v.huella)[0]! === 5)).toHaveLength(3)
    const [zona] = escritorioL.zonasApertura(e)
    expect(escritorioL.zonasApertura(e)).toHaveLength(1)
    expect(zona!.nombre).toBe('el cajón')
    expect(xs(zona!.huella)).toEqual([-80, -40])
    // El frente del tablero principal está en y = −10; el cajón sale 55 (el fondo del tablero menos 5).
    expect(ys(zona!.huella)).toEqual([-10, 45])
    expect([zona!.zMin, zona!.zMax]).toEqual([0, 72])
  })

  it('con el ala a la izquierda la cajonera pasa al extremo derecho: «Voltear» la lleva con el ala', () => {
    const [zona] = escritorioL.zonasApertura(el({ cajonera: true, ala: 'izquierda' }))
    expect(xs(zona!.huella)).toEqual([40, 80])
  })

  it('en 3D, tres frentes con tirador en el frente del tablero principal, y ninguna pata en el extremo de la cajonera', () => {
    const ps = escritorioL.modelo3d!(el({ cajonera: true })).filter((p): p is Caja => p.forma === 'caja')
    const frentes = ps.filter((p) => p.y1 - p.y0 === 2 && p.x0 >= -80 && p.x1 <= -40)
    expect(frentes).toHaveLength(3)
    for (const f of frentes) expect(f.y1).toBeCloseTo(-10 - 1.5)
    expect(escritorioL.modelo3d!(el({ cajonera: true })).filter((p) => p.forma === 'tubo' && p.zona === 'patas')).toHaveLength(3)
    const patas = ps.filter((p) => p.zona === 'patas' && p.x1 - p.x0 === 5)
    expect(patas).toHaveLength(3)
    for (const p of patas) expect(p.x0).toBeGreaterThan(-40)
  })

  it('también admite patas redondas: cinco cilindros sin cajonera', () => {
    const cilindros = escritorioL.modelo3d!(el({ patas: 'redondas' })).filter((p) => p.forma === 'cilindro')
    expect(cilindros).toHaveLength(5)
  })
})
