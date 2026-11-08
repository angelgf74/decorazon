import { describe, expect, it } from 'vitest'
import { detectarConflictos } from '../../conflictos/detectar'
import { documentoNuevo } from '../../modelo/crear'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { valoresVariante, valorVariante } from '../tipos'
import { catalogoBase } from '../catalogoBase'
import { elemento } from './ayuda.test-util'
import { cama } from './cama'

type Caja = Extract<PiezaLocal, { forma: 'caja' }>
const cajas = (medidas = {}, variantes = {}) => cama.modelo3d!(elemento('cama', 0, 0, 0, medidas, variantes)).filter((p): p is Caja => p.forma === 'caja')
const aperturas = (variantes = {}, medidas = {}) => cama.zonasApertura(elemento('cama', 0, 0, 0, medidas, variantes))
const zColchon = 45 - 22

describe('cama: base (patas, canapé, cajones, nido) y lado', () => {
  it('por defecto patas; con menos de 40 de alto solo se admiten las patas (no hay sitio para un canapé)', () => {
    const e = elemento('cama', 0, 0, 0)
    expect(valorVariante(cama, e, 'base')).toBe('patas')
    expect(valoresVariante(cama, e, 'base')).toEqual(['patas', 'canape', 'cajones', 'nido'])
    const baja = elemento('cama', 0, 0, 0, { alto: 30 }, { base: 'canape' })
    expect(valoresVariante(cama, baja, 'base')).toEqual(['patas'])
    expect(valorVariante(cama, baja, 'base')).toBe('patas')
    expect(aperturas({ base: 'canape' }, { alto: 30 })).toEqual([])
  })

  it('el lado solo tiene sentido con nido (dos lados) o cajones (también los dos): con patas o canapé queda un único valor', () => {
    const lados = (base: string) => valoresVariante(cama, elemento('cama', 0, 0, 0, {}, { base }), 'lado')
    expect(lados('patas')).toEqual(['derecha'])
    expect(lados('canape')).toEqual(['derecha'])
    expect(lados('nido')).toEqual(['izquierda', 'derecha'])
    expect(lados('cajones')).toEqual(['izquierda', 'derecha', 'ambos'])
  })

  it('canapé: un bloque cerrado del suelo al colchón en vez de patas y somier, y la tapa se abre hacia arriba sobre la mitad de los pies', () => {
    const ps = cajas({}, { base: 'canape' })
    const estructura = ps.filter((p) => p.zona === 'estructura' && p.z1 !== 100)
    expect(estructura).toHaveLength(1)
    expect(estructura[0]).toMatchObject({ z0: 0, z1: zColchon, x0: -75, x1: 75 })
    const [tapa] = aperturas({ base: 'canape' })
    expect(aperturas({ base: 'canape' })).toHaveLength(1)
    expect(tapa!.nombre).toBe('la tapa del canapé')
    expect(tapa!.zMin).toBe(45)
    expect(tapa!.zMax).toBeCloseTo(45 + 0.85 * 200)
    const ys = tapa!.huella.map((p) => p.y)
    // Elemento en (0, 0) sin giro: la cabecera está en y = −100 + 6 y los pies en y = 100.
    expect(Math.min(...ys)).toBeCloseTo(-100 + 6 + 100)
    expect(Math.max(...ys)).toBeCloseTo(100)
  })

  it('cajones a ambos lados: dos frentes por lado en 3D y una zona «el cajón» de 50 cm fuera de cada lado largo', () => {
    const ps = cajas({}, { base: 'cajones', lado: 'ambos' })
    const frentes = ps.filter((p) => p.zona === 'estructura' && (p.x0 < -75 + 0.5 || p.x1 > 75 - 0.5) && p.z1 <= zColchon && p.x1 - p.x0 <= 2.5)
    expect(frentes.length).toBeGreaterThanOrEqual(4)
    const zonas = aperturas({ base: 'cajones', lado: 'ambos' })
    expect(zonas.map((z) => z.nombre)).toEqual(['el cajón', 'el cajón'])
    const xs = zonas.map((z) => z.huella.map((p) => p.x))
    expect(Math.min(...xs[0]!)).toBeCloseTo(-125)
    expect(Math.max(...xs[0]!)).toBeCloseTo(-75)
    expect(Math.min(...xs[1]!)).toBeCloseTo(75)
    expect(Math.max(...xs[1]!)).toBeCloseTo(125)
    for (const z of zonas) {
      expect(z.zMin).toBe(5)
      expect(z.zMax).toBe(zColchon)
    }
    expect(aperturas({ base: 'cajones', lado: 'izquierda' })).toHaveLength(1)
    expect(aperturas({ base: 'cajones' }).map((z) => Math.min(...z.huella.map((p) => p.x)))).toEqual([75])
  })

  it('nido a la izquierda: la cama que sale ocupa el ancho menos 10 por ese lado, del suelo al colchón', () => {
    const [nido] = aperturas({ base: 'nido', lado: 'izquierda' })
    expect(aperturas({ base: 'nido', lado: 'izquierda' })).toHaveLength(1)
    expect(nido!.nombre).toBe('la cama nido')
    const xs = nido!.huella.map((p) => p.x)
    const ys = nido!.huella.map((p) => p.y)
    expect(Math.max(...xs)).toBeCloseTo(-75)
    expect(Math.min(...xs)).toBeCloseTo(-75 - 140)
    expect(Math.min(...ys)).toBeCloseTo(-100 + 6 + 5)
    expect(Math.max(...ys)).toBeCloseTo(95)
    expect([nido!.zMin, nido!.zMax]).toEqual([5, zColchon])
    // Por defecto sale por la derecha.
    expect(Math.min(...aperturas({ base: 'nido' })[0]!.huella.map((p) => p.x))).toBeCloseTo(75)
  })

  it('las bases no cambian los volúmenes (lo que sale va en las aperturas) y todas las piezas 3D caben en ellos', () => {
    for (const base of ['patas', 'canape', 'cajones', 'nido']) {
      const e = elemento('cama', 0, 0, 0, {}, { base, lado: 'ambos' })
      expect(cama.volumenes(e)).toHaveLength(2)
      for (const p of cajas({}, { base, lado: 'ambos' })) {
        expect(p.x0, base).toBeGreaterThanOrEqual(-75 - 0.1)
        expect(p.x1, base).toBeLessThanOrEqual(75 + 0.1)
      }
    }
  })

  it('una cama nido pegada a la pared izquierda con el nido a ese lado: error «La cama nido de la cama choca con la pared»', () => {
    const doc = documentoNuevo('dormitorio', 400, 330, 250)
    doc.elementos = [elemento('cama', 75, 165, 0, {}, { base: 'nido', lado: 'izquierda' }, 'c')]
    expect(detectarConflictos(doc, catalogoBase)).toEqual([
      expect.objectContaining({ tipo: 'apertura', gravedad: 'error', ids: ['c'], mensaje: 'La cama nido de la cama choca con la pared: faltan 140 cm' }),
    ])
    doc.elementos = [elemento('cama', 75, 165, 0, {}, { base: 'nido', lado: 'derecha' }, 'c')]
    expect(detectarConflictos(doc, catalogoBase)).toEqual([])
  })
})
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
