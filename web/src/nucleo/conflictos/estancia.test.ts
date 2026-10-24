import { describe, expect, it } from 'vitest'
import { documentoNuevo } from '../modelo/crear'
import { areaConSigno, contienePunto, esSimple } from '../geometria/poligono'
import { rectangulo } from '../geometria/formas'
import { obstaculosDeEstancia, penetracionEnParedes } from './estancia'

describe('obstaculosDeEstancia', () => {
  it('puerta abatible hacia dentro: franja y sector', () => {
    const doc = documentoNuevo('dormitorio', 400, 330, 250)
    doc.aberturas.push({ id: 'p1', tipo: 'puerta', pared: 0, posicion: 20, ancho: 80, alto: 210, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' })
    const { aperturas } = obstaculosDeEstancia(doc)
    expect(aperturas).toHaveLength(2)
    expect(aperturas.every((z) => z.id === 'p1' && z.nombre === 'la puerta')).toBe(true)
    expect(aperturas.some((z) => contienePunto(z.huella, { x: 25, y: 75 }))).toBe(true)
  })

  it('puerta corredera: solo la franja', () => {
    const doc = documentoNuevo('dormitorio', 400, 330, 250)
    doc.aberturas.push({ id: 'p1', tipo: 'puerta', pared: 0, posicion: 20, ancho: 80, alto: 210, hoja: 'corredera', bisagra: 'izquierda', abreHacia: 'dentro' })
    const { aperturas } = obstaculosDeEstancia(doc)
    expect(aperturas).toHaveLength(1)
    // Franja de paso: el ancho del hueco por PASO_MINIMO_CM (60) hacia dentro.
    expect(Math.min(...aperturas[0].huella.map((p) => p.x))).toBeCloseTo(20, 9)
    expect(Math.max(...aperturas[0].huella.map((p) => p.x))).toBeCloseTo(100, 9)
    expect(Math.min(...aperturas[0].huella.map((p) => p.y))).toBeCloseTo(0, 9)
    expect(Math.max(...aperturas[0].huella.map((p) => p.y))).toBeCloseTo(60, 9)
  })

  it('puerta con bisagra derecha gira desde el borde lejano', () => {
    const doc = documentoNuevo('dormitorio', 400, 330, 250)
    doc.aberturas.push({ id: 'p1', tipo: 'puerta', pared: 0, posicion: 20, ancho: 80, alto: 210, hoja: 'abatible', bisagra: 'derecha', abreHacia: 'dentro' })
    const { aperturas } = obstaculosDeEstancia(doc)
    expect(aperturas.some((z) => contienePunto(z.huella, { x: 95, y: 75 }))).toBe(true)
    expect(aperturas.some((z) => contienePunto(z.huella, { x: 25, y: 75 }))).toBe(false)
  })

  it('ventana que abre hacia dentro: zona y franja protegida', () => {
    const doc = documentoNuevo('dormitorio', 400, 330, 250)
    doc.aberturas.push({ id: 'v1', tipo: 'ventana', pared: 1, posicion: 50, ancho: 100, alto: 120, alturaSuelo: 90, abreHaciaDentro: true })
    const r = obstaculosDeEstancia(doc)
    expect(r.aperturas).toHaveLength(1)
    expect(r.aperturas[0]).toMatchObject({ id: 'v1', nombre: 'la ventana', zMin: 90, zMax: 210 })
    expect(r.protegidos).toHaveLength(1)
    expect(r.protegidos[0]).toMatchObject({ id: 'v1', nombre: 'ventana', genero: 'f', prisma: { zMin: 90, zMax: 210 } })
  })

  it('viga: prisma z 230–250', () => {
    const doc = documentoNuevo('dormitorio', 400, 330, 250)
    doc.estructura.push({ id: 'b1', tipo: 'viga', desde: { x: 0, y: 150 }, hasta: { x: 400, y: 150 }, ancho: 20, canto: 20 })
    const { fisicos } = obstaculosDeEstancia(doc)
    expect(fisicos).toHaveLength(1)
    expect(fisicos[0]).toMatchObject({ id: 'b1', nombre: 'viga', genero: 'f', prisma: { zMin: 230, zMax: 250 } })
  })

  it('columna y radiador', () => {
    const doc = documentoNuevo('dormitorio', 400, 330, 250)
    doc.estructura.push({ id: 'c1', tipo: 'columna', centro: { x: 100, y: 100 }, ancho: 30, fondo: 30, rotacion: 0 })
    doc.estructura.push({ id: 'r1', tipo: 'radiador', pared: 0, posicion: 100, ancho: 80, alto: 60, fondo: 10, alturaSuelo: 20 })
    const r = obstaculosDeEstancia(doc)
    expect(r.fisicos.map((o) => o.nombre)).toEqual(['columna', 'radiador'])
    expect(r.fisicos[0].prisma).toMatchObject({ zMin: 0, zMax: 250 })
    expect(r.fisicos[1].prisma).toMatchObject({ zMin: 20, zMax: 80 })
    expect(r.protegidos).toHaveLength(1)
    const ys = r.protegidos[0].prisma.huella.map((p) => p.y)
    expect(Math.min(...ys)).toBeCloseTo(10)
    expect(Math.max(...ys)).toBeCloseTo(20)
  })
})

describe('penetracionEnParedes', () => {
  const rect = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 330 }, { x: 0, y: 330 }]
  it('caja dentro: 0', () => {
    expect(penetracionEnParedes(rect, rectangulo({ x: 200, y: 150 }, 100, 100, 0))).toBe(0)
  })
  it('caja que sale 7 cm por la derecha: 7', () => {
    expect(penetracionEnParedes(rect, rectangulo({ x: 357, y: 150 }, 100, 100, 0))).toBeCloseTo(7)
  })
  const L = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 200 }, { x: 200, y: 200 }, { x: 200, y: 400 }, { x: 0, y: 400 }]
  it('L: esquina entrante dentro de la huella', () => {
    expect(penetracionEnParedes(L, rectangulo({ x: 200, y: 200 }, 100, 100, 45))).toBeCloseTo(50, 2)
  })
  it('L: vértice de la huella fuera', () => {
    expect(penetracionEnParedes(L, rectangulo({ x: 300, y: 150 }, 100, 100, 0))).toBeCloseTo(0, 5)
    expect(penetracionEnParedes(L, rectangulo({ x: 380, y: 150 }, 100, 100, 0))).toBeCloseTo(30)
  })
})

describe('penetracionEnParedes: tabique que corta la huella (regla c)', () => {
  // Tabique de 20 cm (x 190..210) que sube desde la pared inferior hasta y = 100.
  const tabique = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 300 }, { x: 210, y: 300 }, { x: 210, y: 100 }, { x: 190, y: 100 }, { x: 190, y: 300 }, { x: 0, y: 300 }]
  it('la planta es simple y horaria', () => {
    expect(esSimple(tabique)).toBe(true)
    expect(areaConSigno(tabique)).toBeGreaterThan(0)
  })
  it('caja 150×200 centrada sobre el tabique: ningún vértice fuera, pero lo atraviesa', () => {
    // x 125..275, y 100..300. Recta x = 190: 65 a la izquierda, 85 a la derecha -> 65; x = 210: 85 / 65 -> 65.
    expect(penetracionEnParedes(tabique, rectangulo({ x: 200, y: 200 }, 150, 200, 0))).toBeCloseTo(65, 9)
  })
  it('un tramo que solo toca el borde no cuenta', () => {
    expect(penetracionEnParedes(tabique, rectangulo({ x: 165, y: 200 }, 50, 100, 0))).toBeCloseTo(0, 9)
  })
})
