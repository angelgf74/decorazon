import { describe, expect, it } from 'vitest'
import { documentoNuevo } from '../../modelo/crear'
import { voltearElemento } from '../../edicion/elementos'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { valoresVariante, valorVariante } from '../tipos'
import { catalogoBase } from '../catalogoBase'
import { elemento } from './ayuda.test-util'
import { escritorio } from './escritorio'

type Caja = Extract<PiezaLocal, { forma: 'caja' }>
const el = (variantes = {}, medidas = {}) => elemento('escritorio', 0, 0, 0, medidas, variantes)
const cajas = (variantes = {}, medidas = {}) => escritorio.modelo3d!(el(variantes, medidas)).filter((p): p is Caja => p.forma === 'caja')
const xs = (huella: { x: number }[]) => [Math.min(...huella.map((p) => p.x)), Math.max(...huella.map((p) => p.x))]
// Escritorio por defecto: 120 × 60 × 75. La cajonera mide 40 de ancho.
const CAJONERA = 40

describe('escritorio: cajonera a un lado, al otro o a los dos', () => {
  it('por defecto sin cajonera: tablero y cuatro patas, sin aperturas', () => {
    expect(valorVariante(escritorio, el(), 'cajonera')).toBe('no')
    expect(escritorio.volumenes(el())).toHaveLength(5)
    expect(escritorio.zonasApertura(el())).toEqual([])
    expect(cajas()).toHaveLength(5)
  })

  it('con menos de 100 de ancho no caben dos cajoneras (quedarían menos de 20 cm para las piernas)', () => {
    expect(valoresVariante(escritorio, el({}, { ancho: 80 }), 'cajonera')).toEqual(['no', 'izquierda', 'derecha'])
    expect(valoresVariante(escritorio, el({}, { ancho: 100 }), 'cajonera')).toEqual(['no', 'izquierda', 'derecha', 'ambas'])
    expect(valorVariante(escritorio, el({ cajonera: 'ambas' }, { ancho: 80 }), 'cajonera')).toBe('no')
  })

  it('cajonera a la derecha: un bloque de 40 del suelo al tablero en ese lado y dos patas en el otro; un cajón que abre por delante', () => {
    const vols = escritorio.volumenes(el({ cajonera: 'derecha' }))
    expect(vols).toHaveLength(4)
    const cajonera = vols.find((v) => xs(v.huella)[1]! - xs(v.huella)[0]! === CAJONERA)!
    expect(xs(cajonera.huella)).toEqual([60 - CAJONERA, 60])
    expect([cajonera.zMin, cajonera.zMax]).toEqual([0, 72])
    const patas = vols.filter((v) => xs(v.huella)[1]! - xs(v.huella)[0]! === 5)
    expect(patas).toHaveLength(2)
    for (const p of patas) expect(xs(p.huella)[0]).toBeCloseTo(-60 + 3)
    const zonas = escritorio.zonasApertura(el({ cajonera: 'derecha' }))
    expect(zonas.map((z) => z.nombre)).toEqual(['el cajón'])
    expect(xs(zonas[0]!.huella)).toEqual([60 - CAJONERA, 60])
    expect(Math.min(...zonas[0]!.huella.map((p) => p.y))).toBeCloseTo(30)
    expect([zonas[0]!.zMin, zonas[0]!.zMax]).toEqual([0, 72])
  })

  it('cajonera a la izquierda: todo espejado; con las dos, cuatro cajones (dos zonas) y ninguna pata', () => {
    const izq = escritorio.zonasApertura(el({ cajonera: 'izquierda' }))
    expect(xs(izq[0]!.huella)).toEqual([-60, -60 + CAJONERA])
    const ambas = el({ cajonera: 'ambas' })
    expect(escritorio.zonasApertura(ambas)).toHaveLength(2)
    expect(escritorio.volumenes(ambas)).toHaveLength(3)
  })

  it('en 3D, cada cajonera lleva tres frentes con tirador dentro de su tramo, y las patas solo en el lado libre', () => {
    const ps = cajas({ cajonera: 'derecha' })
    const frentes = ps.filter((p) => p.y1 - p.y0 === 2 && p.x0 >= 60 - CAJONERA - 0.01 && p.x1 <= 60 + 0.01)
    expect(frentes).toHaveLength(3)
    const tiradores = ps.filter((p) => p.zona === 'patas' && p.z1 - p.z0 === 1.5)
    expect(tiradores).toHaveLength(3)
    const patas = ps.filter((p) => p.zona === 'patas' && p.x1 - p.x0 === 5)
    expect(patas).toHaveLength(2)
    for (const p of patas) expect(p.x0).toBe(-60 + 3)
    expect(cajas({ cajonera: 'ambas' }).filter((p) => p.y1 - p.y0 === 2)).toHaveLength(6)
  })

  it('«Voltear» pasa la cajonera de un lado al otro y deja «no» y «ambas» como están', () => {
    const doc = documentoNuevo('despacho', 400, 400, 250)
    const voltear = (cajonera: string) => {
      doc.elementos = [elemento('escritorio', 200, 200, 0, {}, { cajonera }, 'e')]
      return voltearElemento(doc, catalogoBase, 'e').elementos[0]!.variantes.cajonera
    }
    expect(voltear('izquierda')).toBe('derecha')
    expect(voltear('derecha')).toBe('izquierda')
    expect(voltear('no')).toBe('no')
    expect(voltear('ambas')).toBe('ambas')
  })
})

describe('escritorio: forma y material de las patas (plan 28c)', () => {
  it('admite patas redondas también con cajonera (las dos del lado libre son cilindros) y el material de las patas se elige', () => {
    expect(escritorio.variantes.map((v) => v.clave)).toContain('patas')
    const ps = escritorio.modelo3d!(el({ cajonera: 'derecha', patas: 'redondas' }))
    const cilindros = ps.filter((p): p is Extract<PiezaLocal, { forma: 'cilindro' }> => p.forma === 'cilindro')
    expect(cilindros).toHaveLength(2)
    for (const c of cilindros) {
      expect(c.r).toBe(2.5)
      expect(c.cx).toBeCloseTo(-60 + 3 + 2.5)
      expect(c.zona).toBe('patas')
    }
    expect(escritorio.modelo3d!(el({ patas: 'redondas' })).filter((p) => p.forma === 'cilindro')).toHaveLength(4)
    expect(escritorio.zonasColor.find((z) => z.clave === 'patas')!.materiales).toEqual(expect.arrayContaining(['madera', 'metal', 'lacado']))
  })
})
