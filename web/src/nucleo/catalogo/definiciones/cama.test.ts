import { describe, expect, it } from 'vitest'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { elemento } from './ayuda.test-util'
import { cama } from './cama'

type Caja = Extract<PiezaLocal, { forma: 'caja' }>
const cajas = (medidas = {}, variantes = {}) => cama.modelo3d!(elemento('cama', 0, 0, 0, medidas, variantes)).filter((p): p is Caja => p.forma === 'caja')
const almohadas = (ps: Caja[]) => ps.filter((p) => p.zona === 'ropa' && p.z1 - p.z0 === 10 && p.y1 - p.y0 === 40)
const edredon = (ps: Caja[]) => ps.find((p) => p.zona === 'ropa' && p.z1 - p.z0 === 6)!

describe('cama: ropa de cama con forma', () => {
  it('con 150 de ancho, dos almohadas redondeadas de 67,5 (5 cm de aire a los lados y entre ellas), simétricas, hasta el alto', () => {
    const ps = cajas()
    const a = almohadas(ps)
    expect(a).toHaveLength(2)
    for (const p of a) {
      expect(p.radio).toBe(4)
      expect(p.x1 - p.x0).toBe(67.5)
      expect(p.z1).toBe(45)
    }
    const [izq, der] = a.sort((p, q) => p.x0 - q.x0)
    expect(izq!.x0).toBe(-der!.x1)
    expect(der!.x0 - izq!.x1).toBe(5)
  })

  it('con 80 de ancho, una almohada de 70; con 220, dos de 80', () => {
    expect(almohadas(cajas({ ancho: 80 })).map((p) => p.x1 - p.x0)).toEqual([70])
    expect(almohadas(cajas({ ancho: 220 })).map((p) => p.x1 - p.x0)).toEqual([80, 80])
  })

  it('el edredón empieza 50 cm tras la cabecera del colchón, tiene 6 de grueso y radio 3; las almohadas son lo que llega al alto', () => {
    for (const alto of [20, 45, 70]) {
      const ps = cajas({ alto })
      const e = edredon(ps)
      expect(e.radio).toBe(3)
      expect(e.y0).toBe(-100 + 6 + 50)
      expect(e.z1).toBe(alto - 4)
      expect(Math.max(...ps.filter((p) => p.zona === 'ropa').map((p) => p.z1))).toBe(alto)
      for (const p of ps) expect(p.z0, JSON.stringify(p)).toBeGreaterThanOrEqual(0)
    }
  })

  it('con 20 de alto no hay patas ni somier: solo colchón, ropa y cabecero', () => {
    const ps = cajas({ alto: 20 })
    expect(ps.filter((p) => p.zona === 'estructura')).toHaveLength(1)
    expect(ps.find((p) => p.zona === 'estructura')!.z1).toBe(100)
  })

  it('sin cabecero, colchón y edredón empiezan en el fondo', () => {
    const ps = cajas({}, { cabecero: false })
    expect(edredon(ps).y0).toBe(-100 + 50)
    expect(Math.min(...ps.map((p) => p.y0))).toBe(-100)
    expect(ps.some((p) => p.zona === 'estructura' && p.z1 === 100)).toBe(false)
  })
})
