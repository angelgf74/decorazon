import { describe, expect, it } from 'vitest'
import { documentoNuevo } from '../modelo/crear'
import type { DocumentoDiseno, Punto } from '../modelo/documento'
import { areaConSigno, desplazarPoligono } from '../geometria/poligono'
import { escenaEstancia } from './estancia'
import type { Pieza3D } from './tipos'

const areaHuella = (h: [number, number][]): number => Math.abs(areaConSigno(h.map(([x, y]) => ({ x, y }))))
const areaAnillo = (planta: Punto[], grosor: number): number =>
  (Math.abs(areaConSigno(desplazarPoligono(planta, grosor))) - Math.abs(areaConSigno(planta))) / 10000
const prisma = (p: Pieza3D) => {
  if (p.forma !== 'prisma') throw new Error('forma')
  return p
}

function conPlanta(planta: Punto[]): DocumentoDiseno {
  const doc = documentoNuevo('salon', 400, 330, 250)
  doc.estancia.planta = planta
  return doc
}

describe('escenaEstancia: muros', () => {
  it('rectángulo 400×330 sin aberturas: 4 muros que cubren el anillo, de suelo a techo', () => {
    const doc = documentoNuevo('salon', 400, 330, 250)
    const { muros, suelo } = escenaEstancia(doc)
    expect(suelo).toEqual(doc.estancia.planta)
    expect(muros).toHaveLength(4)
    expect(muros.map((m) => m.pared)).toEqual([0, 1, 2, 3])
    const suma = muros.reduce((s, m) => s + areaHuella(prisma(m).huella), 0)
    expect(Math.abs(suma - areaAnillo(doc.estancia.planta, 10))).toBeLessThan(1e-6)
    for (const m of muros) {
      expect(prisma(m).y0).toBe(0)
      expect(prisma(m).y1).toBe(2.5)
      expect(m).toMatchObject({ material: 'pared', color: doc.estancia.colorParedes })
    }
  })

  it('L de 6 vértices: 6 muros que cubren el anillo, con la esquina entrante', () => {
    const planta = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 200 }, { x: 250, y: 200 }, { x: 250, y: 330 }, { x: 0, y: 330 }]
    const { muros } = escenaEstancia(conPlanta(planta))
    expect(muros).toHaveLength(6)
    const suma = muros.reduce((s, m) => s + areaHuella(prisma(m).huella), 0)
    expect(Math.abs(suma - areaAnillo(planta, 10))).toBeLessThan(1e-6)
  })

  it('pared oblicua: el anillo sigue cubierto', () => {
    const planta = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 300, y: 330 }, { x: 0, y: 330 }]
    const { muros } = escenaEstancia(conPlanta(planta))
    const suma = muros.reduce((s, m) => s + areaHuella(prisma(m).huella), 0)
    expect(Math.abs(suma - areaAnillo(planta, 10))).toBeLessThan(1e-6)
  })

  it('puerta 82×203 en la pared 0: dos laterales de suelo a techo y el dintel; marco de 3 y hoja', () => {
    const doc = documentoNuevo('salon', 400, 330, 250)
    doc.aberturas.push({ id: 'p1', tipo: 'puerta', pared: 0, posicion: 159, ancho: 82, alto: 203, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' })
    const { muros, huecos } = escenaEstancia(doc)
    const pared0 = muros.filter((m) => m.pared === 0).map(prisma)
    expect(pared0).toHaveLength(3)
    const alturas = pared0.map((p) => [p.y0, p.y1])
    expect(alturas.filter(([y0, y1]) => y0 === 0 && y1 === 2.5)).toHaveLength(2)
    expect(alturas).toContainEqual([2.03, 2.5])
    const dintel = pared0.find((p) => p.y0 === 2.03)!
    const xs = dintel.huella.map(([x]) => x)
    expect(Math.min(...xs)).toBeCloseTo(1.59)
    expect(Math.max(...xs)).toBeCloseTo(2.41)
    const suma = muros.reduce((s, m) => s + areaHuella(prisma(m).huella), 0)
    expect(Math.abs(suma - areaAnillo(doc.estancia.planta, 10))).toBeLessThan(1e-6)
    expect(huecos).toHaveLength(4)
    expect(huecos.filter((h) => h.material === 'madera' && h.color === '#d9c7a8')).toHaveLength(1)
    const hoja = huecos.find((h) => h.material === 'madera')!
    if (hoja.forma !== 'caja') throw new Error('forma')
    // A ras de la cara interior (y = 0 del plano), 4 cm hacia fuera.
    expect(hoja.centro[2]).toBeCloseTo(-0.02)
    expect(hoja.tamano[2]).toBeCloseTo(0.04)
    expect(hoja.centro[0]).toBeCloseTo(2)
  })

  it('ventana con alturaSuelo 90 y alto 120: laterales, antepecho y dintel; marco de 4 y cristal', () => {
    const doc = documentoNuevo('salon', 400, 330, 250)
    doc.aberturas.push({ id: 'v1', tipo: 'ventana', pared: 1, posicion: 50, ancho: 100, alto: 120, alturaSuelo: 90, abreHaciaDentro: false })
    const { muros, huecos } = escenaEstancia(doc)
    const pared1 = muros.filter((m) => m.pared === 1).map(prisma)
    expect(pared1).toHaveLength(4)
    const alturas = pared1.map((p) => [p.y0, p.y1])
    expect(alturas.filter(([y0, y1]) => y0 === 0 && y1 === 2.5)).toHaveLength(2)
    expect(alturas).toContainEqual([0, 0.9])
    expect(alturas).toContainEqual([2.1, 2.5])
    expect(huecos).toHaveLength(5)
    expect(huecos.filter((h) => h.material === 'lacado' && h.color === '#f5f3ee')).toHaveLength(4)
    const cristal = huecos.find((h) => h.material === 'vidrio')!
    if (cristal.forma !== 'caja') throw new Error('forma')
    expect(cristal.color).toBe('#cfe3ea')
    // Pared 1 es x = 400 hacia abajo: centrado en el grosor, x = 4.05; giro de −90°.
    expect(cristal.centro[0]).toBeCloseTo(4.05)
    expect(cristal.centro[2]).toBeCloseTo(1)
    expect(cristal.giroY).toBeCloseTo(-Math.PI / 2)
    expect(cristal.tamano[2]).toBeCloseTo(0.01)
  })

  it('aberturas pegadas a los extremos y ventana hasta el techo: ningún trozo vacío', () => {
    const doc = documentoNuevo('salon', 400, 330, 250)
    doc.aberturas.push(
      { id: 'p1', tipo: 'puerta', pared: 0, posicion: 0, ancho: 82, alto: 203, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' },
      { id: 'p2', tipo: 'puerta', pared: 2, posicion: 318, ancho: 82, alto: 250, hoja: 'corredera', bisagra: 'izquierda', abreHacia: 'dentro' },
      { id: 'v1', tipo: 'ventana', pared: 1, posicion: 100, ancho: 100, alto: 160, alturaSuelo: 90, abreHaciaDentro: false },
    )
    const { muros } = escenaEstancia(doc)
    for (const m of muros.map(prisma)) {
      expect(areaHuella(m.huella)).toBeGreaterThan(1e-9)
      expect(m.y1).toBeGreaterThan(m.y0)
    }
    expect(muros.filter((m) => m.pared === 0)).toHaveLength(2)
    expect(muros.filter((m) => m.pared === 2)).toHaveLength(1)
    expect(muros.filter((m) => m.pared === 1)).toHaveLength(3)
  })
})

describe('escenaEstancia: estructura', () => {
  it('viga de canto 30 en una estancia de 250 va de 2.2 a 2.5', () => {
    const doc = documentoNuevo('salon', 400, 330, 250)
    doc.estructura.push({ id: 'g1', tipo: 'viga', desde: { x: 0, y: 100 }, hasta: { x: 400, y: 100 }, ancho: 20, canto: 30 })
    const [viga] = escenaEstancia(doc).estructura
    if (viga.forma !== 'caja') throw new Error('forma')
    expect(viga.centro[1] - viga.tamano[1] / 2).toBeCloseTo(2.2)
    expect(viga.centro[1] + viga.tamano[1] / 2).toBeCloseTo(2.5)
    expect(viga.tamano[0]).toBeCloseTo(4)
    expect(viga).toMatchObject({ material: 'pared', color: doc.estancia.colorParedes })
  })

  it('columna de suelo a techo con su giro', () => {
    const doc = documentoNuevo('salon', 400, 330, 250)
    doc.estructura.push({ id: 'c1', tipo: 'columna', centro: { x: 100, y: 100 }, ancho: 30, fondo: 20, rotacion: 90 })
    const [col] = escenaEstancia(doc).estructura
    if (col.forma !== 'caja') throw new Error('forma')
    expect(col.centro).toEqual([1, 1.25, 1])
    expect(col.tamano).toEqual([0.3, 2.5, 0.2])
    expect(col.giroY).toBeCloseTo(-Math.PI / 2)
  })

  it('radiador pegado a la cara interior con su altura', () => {
    const doc = documentoNuevo('salon', 400, 330, 250)
    doc.estructura.push({ id: 'r1', tipo: 'radiador', pared: 0, posicion: 100, ancho: 80, alto: 60, fondo: 10, alturaSuelo: 15 })
    const { estructura, muros } = escenaEstancia(doc)
    expect(muros.filter((m) => m.pared === 0)).toHaveLength(1)
    const [r] = estructura
    if (r.forma !== 'caja') throw new Error('forma')
    expect(r).toMatchObject({ material: 'metal', color: '#f2f2f2' })
    expect(r.centro[0]).toBeCloseTo(1.4)
    expect(r.centro[1]).toBeCloseTo(0.45)
    expect(r.centro[2]).toBeCloseTo(0.05)
    expect(r.tamano[0]).toBeCloseTo(0.8)
    expect(r.tamano[1]).toBeCloseTo(0.6)
    expect(r.tamano[2]).toBeCloseTo(0.1)
  })
})
