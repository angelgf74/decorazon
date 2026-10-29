import { describe, expect, it } from 'vitest'
import { catalogoBase } from '../catalogo/catalogoBase'
import { elementoNuevo } from '../catalogo/elemento'
import { detectarConflictos } from '../conflictos/detectar'
import { rectangulo } from '../geometria/formas'
import { documentoNuevo } from '../modelo/crear'
import type { DocumentoDiseno, Elemento, Punto } from '../modelo/documento'
import { imantar } from './iman'

const sala = (): DocumentoDiseno => documentoNuevo('dormitorio', 400, 330, 250)
const armario = (posicion: Punto, rotacion = 0, id?: string): Elemento =>
  ({ ...elementoNuevo(catalogoBase.get('armario')!, { ...posicion }, id), rotacion })

describe('imantar', () => {
  it('pega a la pared de arriba', () => {
    const r = imantar(sala(), catalogoBase, armario({ x: 200, y: 38 }), { libre: false })
    expect(r.posicion).toEqual({ x: 200, y: 30 })
    expect(r.rotacion).toBe(0)
    expect(r.pegadoA).toContain('pared:0')
  })
  it('encaja en la esquina', () => {
    const r = imantar(sala(), catalogoBase, armario({ x: 56, y: 36 }), { libre: false })
    expect(r.posicion).toEqual({ x: 50, y: 30 })
    expect(r.pegadoA.sort()).toEqual(['pared:0', 'pared:3'])
  })
  it('lejos de las paredes no mueve nada', () => {
    const r = imantar(sala(), catalogoBase, armario({ x: 200, y: 70 }), { libre: false })
    expect(r.posicion).toEqual({ x: 200, y: 70 })
    expect(r.pegadoA).toEqual([])
  })
  it('sin libre redondea el giro a 90', () => {
    expect(imantar(sala(), catalogoBase, armario({ x: 200, y: 165 }, 93), { libre: false }).rotacion).toBe(90)
    expect(imantar(sala(), catalogoBase, armario({ x: 200, y: 165 }, -91), { libre: false }).rotacion).toBe(270)
  })
  it('con libre y lejos de las paredes conserva el giro entero', () => {
    expect(imantar(sala(), catalogoBase, armario({ x: 200, y: 165 }, 93), { libre: true }).rotacion).toBe(93)
    expect(imantar(sala(), catalogoBase, armario({ x: 200, y: 165 }, 92.6), { libre: true }).rotacion).toBe(93)
  })
  it('con libre solo endereza junto a la pared si la diferencia es de 5° o menos', () => {
    const cerca = imantar(sala(), catalogoBase, armario({ x: 200, y: 40 }, 4), { libre: true })
    expect(cerca.rotacion).toBe(0)
    expect(cerca.posicion.y).toBe(30)
    const lejos = imantar(sala(), catalogoBase, armario({ x: 200, y: 50 }, 20), { libre: true })
    expect(lejos.rotacion).toBe(20)
    expect(lejos.pegadoA).toEqual([])
  })
  it('pega un armario a otro a ras', () => {
    const doc = sala()
    const primero = armario({ x: 100, y: 30 }, 0, 'a1')
    doc.elementos.push(primero)
    const r = imantar(doc, catalogoBase, armario({ x: 210, y: 36 }, 0, 'a2'), { libre: false })
    expect(r.posicion).toEqual({ x: primero.posicion.x + 100, y: 30 })
    expect(r.pegadoA.sort()).toEqual(['a1', 'pared:0'])
  })
  it('no se pega a un mueble girado distinto ni a sí mismo', () => {
    const doc = sala()
    const yo = armario({ x: 200, y: 165 }, 0, 'yo')
    doc.elementos.push(armario({ x: 300, y: 165 }, 45, 'otro'), yo)
    const r = imantar(doc, catalogoBase, { ...yo, posicion: { x: 205, y: 165 } }, { libre: false })
    expect(r.posicion).toEqual({ x: 205, y: 165 })
    expect(r.pegadoA).toEqual([])
  })
  it('no muta el elemento ni el documento', () => {
    const doc = sala()
    const e = armario({ x: 200, y: 38 }, 3)
    const antes = JSON.stringify([doc, e])
    imantar(doc, catalogoBase, e, { libre: false })
    expect(JSON.stringify([doc, e])).toBe(antes)
  })

  describe('pared a 45°', () => {
    const pentagono = (): DocumentoDiseno => {
      const d = sala()
      d.estancia.planta = [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 400, y: 100 }, { x: 400, y: 330 }, { x: 0, y: 330 }]
      return d
    }
    const anguloPared = 45
    const mod90 = (g: number) => ((g % 90) + 90) % 90
    const distanciaAngular = (a: number, b: number) => {
      const d = Math.abs(a - b) % 360
      return Math.min(d, 360 - d)
    }
    // Distancia con signo a la recta de la pared 1, positiva hacia dentro.
    const hueco = (p: Punto) => (-(p.x - 300) + p.y) / Math.SQRT2
    const casos: [number, boolean][] = [[0, false], [132, true], [40, true]]

    for (const [giro, libre] of casos) {
      it(`giro ${giro}${libre ? ' libre' : ''}: alinea con la pared, a ras y sin salirse`, () => {
        const doc = pentagono()
        const e = armario({ x: 322, y: 88 }, giro, 'a')
        const r = imantar(doc, catalogoBase, e, { libre })
        expect(mod90(r.rotacion)).toBe(mod90(anguloPared))
        const inicial = libre ? giro : Math.round(giro / 90) * 90
        expect(distanciaAngular(r.rotacion, inicial)).toBeLessThanOrEqual(45)
        const rect = rectangulo(r.posicion, 100, 60, r.rotacion)
        expect(Math.min(...rect.map(hueco))).toBeCloseTo(0, 1)
        expect(r.pegadoA).toContain('pared:1')
        doc.elementos.push({ ...e, posicion: r.posicion, rotacion: r.rotacion })
        expect(detectarConflictos(doc, catalogoBase).filter(c => c.tipo === 'fueraDeEstancia')).toEqual([])
      })
    }
    it('con libre elige el candidato más cercano al giro inicial', () => {
      expect(imantar(pentagono(), catalogoBase, armario({ x: 322, y: 88 }, 132), { libre: true }).rotacion).toBe(135)
      expect(imantar(pentagono(), catalogoBase, armario({ x: 322, y: 88 }, 40), { libre: true }).rotacion).toBe(45)
    })
  })
})
