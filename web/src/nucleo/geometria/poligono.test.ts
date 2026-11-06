import { describe, expect, it } from 'vitest'
import { areaConSigno, cajaPlanta, contienePunto, distanciaAlBorde, distanciaPuntoSegmento, desplazarPoligono, distanciaSegmentos, esSimple, perimetro, puntoInterior, superficie } from './poligono'

const sala = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 330 }, { x: 0, y: 330 }]

describe('poligono', () => {
  it('área con signo: horario en pantalla es positiva', () => {
    expect(areaConSigno(sala)).toBe(132000)
    expect(areaConSigno([...sala].reverse())).toBe(-132000)
  })
  it('esSimple', () => {
    const pajarita = [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 100, y: 0 }, { x: 0, y: 100 }]
    const ele = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 100 }, { x: 100, y: 100 }, { x: 100, y: 300 }, { x: 0, y: 300 }]
    expect(esSimple(pajarita)).toBe(false)
    expect(esSimple(ele)).toBe(true)
    expect(esSimple(sala)).toBe(true)
  })
  it('contienePunto: dentro, fuera y borde', () => {
    expect(contienePunto(sala, { x: 200, y: 100 })).toBe(true)
    expect(contienePunto(sala, { x: 401, y: 100 })).toBe(false)
    expect(contienePunto(sala, { x: 400, y: 100 })).toBe(true)
    expect(contienePunto(sala, { x: 0, y: 0 })).toBe(true)
  })
  it('distancias', () => {
    expect(distanciaPuntoSegmento({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(3)
    expect(distanciaPuntoSegmento({ x: 13, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5)
    expect(distanciaAlBorde(sala, { x: 100, y: 30 })).toBe(30)
    expect(distanciaSegmentos({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 })).toBe(0)
    expect(distanciaSegmentos({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 })).toBe(5)
  })
  it('desplazarPoligono: rectángulo', () => {
    expect(desplazarPoligono(sala, 10)).toEqual([{ x: -10, y: -10 }, { x: 410, y: -10 }, { x: 410, y: 340 }, { x: -10, y: 340 }])
  })
  it('desplazarPoligono: el vértice reflejo de una L va hacia dentro de la L, en inglete', () => {
    const ele = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 100 }, { x: 100, y: 100 }, { x: 100, y: 300 }, { x: 0, y: 300 }]
    expect(desplazarPoligono(ele, 10)).toEqual([
      { x: -10, y: -10 }, { x: 210, y: -10 }, { x: 210, y: 110 }, { x: 110, y: 110 }, { x: 110, y: 310 }, { x: -10, y: 310 },
    ])
  })
  it('desplazarPoligono: aristas colineales usan el punto desplazado', () => {
    const conPuntoIntermedio = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 330 }, { x: 0, y: 330 }]
    expect(desplazarPoligono(conPuntoIntermedio, 10)[1]).toEqual({ x: 200, y: -10 })
  })
})

describe('superficie y perimetro', () => {
  const ele = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 100 }, { x: 100, y: 100 }, { x: 100, y: 300 }, { x: 0, y: 300 }]

  it('superficie en cm², siempre positiva, también de una L', () => {
    expect(superficie(sala)).toBe(132000)
    expect(superficie([...sala].reverse())).toBe(132000)
    expect(superficie(ele)).toBe(40000)
  })
  it('perímetro: suma de las paredes', () => {
    expect(perimetro(sala)).toBe(1460)
    expect(perimetro(ele)).toBe(1000)
  })
})

describe('cajaPlanta', () => {
  it('da los extremos de la caja envolvente, también de una L', () => {
    expect(cajaPlanta(sala)).toEqual({ minX: 0, minY: 0, maxX: 400, maxY: 330 })
    const ele = [{ x: -50, y: 10 }, { x: 300, y: 10 }, { x: 300, y: 150 }, { x: 150, y: 150 }, { x: 150, y: 400 }, { x: -50, y: 400 }]
    expect(cajaPlanta(ele)).toEqual({ minX: -50, minY: 10, maxX: 300, maxY: 400 })
  })
})

describe('puntoInterior', () => {
  const ele = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 150 }, { x: 150, y: 150 }, { x: 150, y: 400 }, { x: 0, y: 400 }]

  it('en un rectángulo es el centro de la caja, en cm enteros', () => {
    expect(puntoInterior(sala)).toEqual({ x: 200, y: 165 })
    expect(puntoInterior([{ x: 0, y: 0 }, { x: 401, y: 0 }, { x: 401, y: 331 }, { x: 0, y: 331 }])).toEqual({ x: 201, y: 166 })
  })
  it('en una L, donde el centro de la caja cae fuera, da un punto de dentro lejos del borde', () => {
    const p = puntoInterior(ele)
    expect(contienePunto(ele, p)).toBe(true)
    expect(distanciaAlBorde(ele, p)).toBeGreaterThanOrEqual(50)
    expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true)
  })
  it('si el centro de la caja cae justo en el borde tampoco lo usa', () => {
    const borde = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 100 }, { x: 400, y: 100 }, { x: 400, y: 200 }, { x: 0, y: 200 }]
    const p = puntoInterior(borde)
    expect(p).not.toEqual({ x: 200, y: 100 })
    expect(distanciaAlBorde(borde, p)).toBeGreaterThanOrEqual(1)
  })
})
