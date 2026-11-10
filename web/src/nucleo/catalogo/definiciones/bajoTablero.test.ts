import { describe, expect, it } from 'vitest'
import { catalogoBase } from '../catalogoBase'
import { huellasEnPlanta } from '../elemento'
import { documentoNuevo } from '../../modelo/crear'
import { detectarConflictos } from '../../conflictos/detectar'
import type { Elemento } from '../../modelo/documento'
import { elemento } from './ayuda.test-util'

const def = (id: string) => {
  const d = catalogoBase.get(id)
  if (!d) throw new Error(id)
  return d
}

/** Despacho de 400×400 con el escritorio (120×60×75) en el centro, de cara a +y. */
function conEscritorio(...otros: Elemento[]) {
  const doc = documentoNuevo('despacho', 400, 400, 250)
  doc.elementos = [elemento('escritorio', 200, 200, 0, {}, {}, 'escritorio'), ...otros]
  return detectarConflictos(doc, catalogoBase)
}

describe('mesas y escritorios: bajo el tablero queda hueco', () => {
  it('chocan con el tablero y las cuatro patas', () => {
    const v = def('escritorio').volumenes(elemento('escritorio', 0, 0, 0))
    expect(v).toHaveLength(5)
    expect(v[0]).toMatchObject({ zMin: 72, zMax: 75 })
    for (const pata of v.slice(1)) expect(pata).toMatchObject({ zMin: 0, zMax: 72 })
    expect(def('mesa').volumenes(elemento('mesa', 0, 0, 0))).toHaveLength(5)
  })
  it('en el plano se pintan como un solo rectángulo', () => {
    expect(huellasEnPlanta(def('escritorio'), elemento('escritorio', 0, 0, 0))).toHaveLength(1)
    expect(huellasEnPlanta(def('mesa'), elemento('mesa', 0, 0, 0))).toHaveLength(1)
  })
  it('una silla metida bajo el escritorio hasta el respaldo no choca', () => {
    // Silla girada 180°: el respaldo (y local negativa) queda hacia +y, fuera del tablero (y de 170 a 230).
    // Centro en y=240: asiento de 215 a 265, que entra 15 cm bajo el tablero; respaldo de 259 a 265.
    expect(conEscritorio(elemento('silla', 200, 240, 180))).toEqual([])
  })
  it('si el respaldo entra bajo el tablero, choca', () => {
    // Centro en y=200: respaldo de 219 a 225, bajo el tablero (de 72 a 75 cm de alto).
    const conflictos = conEscritorio(elemento('silla', 200, 200, 180, {}, {}, 'silla'))
    expect(conflictos.some((c) => c.tipo === 'solape' && c.ids.includes('silla'))).toBe(true)
  })
  it('las sillas chocan con el asiento a su altura y con el respaldo detrás', () => {
    const v = def('silla').volumenes(elemento('silla', 0, 0, 0))
    expect(v).toHaveLength(2)
    expect(v[0]).toMatchObject({ zMin: 0, zMax: 45 })
    expect(v[1]).toMatchObject({ zMin: 45, zMax: 85 })
    expect(huellasEnPlanta(def('silla'), elemento('silla', 0, 0, 0))).toHaveLength(1)
  })
})
