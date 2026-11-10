import { describe, expect, it } from 'vitest'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { cajaDePieza } from '../../modelo3d/formas'
import { lavabo } from './lavabo'
import { elemento } from './ayuda.test-util'

type Extrusion = Extract<PiezaLocal, { forma: 'extrusion' }>
type Revolucion = Extract<PiezaLocal, { forma: 'revolucion' }>
type Tubo = Extract<PiezaLocal, { forma: 'tubo' }>
const piezas = (variantes = {}, medidas = {}) => lavabo.modelo3d!(elemento('lavabo', 0, 0, 0, medidas, variantes))
const encimera = (ps: PiezaLocal[]) => ps.find((p): p is Extrusion => p.forma === 'extrusion' && p.zona === 'lavabo')!
const senos = (ps: PiezaLocal[]) => ps.filter((p): p is Revolucion => p.forma === 'revolucion' && p.zona === 'lavabo')

describe('lavabo en 3D', () => {
  it('la encimera es una extrusión en planta de 3 cm con un hueco ovalado por seno', () => {
    const e = encimera(piezas())
    expect(e).toMatchObject({ plano: 'planta', desde: 82, hasta: 85 })
    expect(cajaDePieza(e)).toMatchObject({ x0: -40, x1: 40, y0: -23, y1: 23 })
    expect(e.huecos).toHaveLength(1)
    expect(encimera(piezas({ senos: 2 }, { ancho: 120 })).huecos).toHaveLength(2)
  })

  it('bajo cada hueco, un seno ovalado de revolución que se hunde desde la encimera y lo cubre entero', () => {
    const ps = piezas()
    const [seno] = senos(ps)
    const hueco = cajaDePieza({ ...encimera(ps), huecos: undefined, contorno: encimera(ps).huecos![0]! })
    const c = cajaDePieza(seno!)
    expect(c.z1).toBe(82)
    expect(82 - c.z0).toBeGreaterThanOrEqual(12)
    expect(c.x0).toBeLessThan(hueco.x0)
    expect(c.x1).toBeGreaterThan(hueco.x1)
    expect(c.y0).toBeLessThan(hueco.y0)
    expect(c.y1).toBeGreaterThan(hueco.y1)
    expect(seno!.escalaY).not.toBe(1)
  })

  it('el mueble no tapa el seno: lo que se cruza con él en planta acaba por debajo de su fondo', () => {
    for (const variantes of [{}, { montaje: 'al suelo' }]) {
      const ps = piezas(variantes)
      const s = cajaDePieza(senos(ps)[0]!)
      const debajo = ps.filter((p) => p.forma === 'caja' && p.zona === 'mueble').map(cajaDePieza)
        .filter((c) => c.x0 < s.x1 && c.x1 > s.x0 && c.y0 < s.y1 && c.y1 > s.y0)
      expect(debajo.length).toBeGreaterThan(0)
      for (const c of debajo) expect(c.z1).toBeLessThanOrEqual(s.z0)
    }
  })

  it('el grifo es un caño de tubo que sube y se dobla hacia el seno, con los codos redondeados', () => {
    const tubos = piezas().filter((p): p is Tubo => p.forma === 'tubo' && p.zona === 'grifo')
    expect(tubos).toHaveLength(1)
    const [cano] = tubos
    expect(cano!.codo).toBeGreaterThan(0)
    const [primero, , , ultimo] = cano!.puntos
    expect(ultimo![1]).toBeGreaterThan(primero![1])
    expect(Math.max(...cano!.puntos.map(([, , z]) => z))).toBeGreaterThan(85 + 10)
  })
})
