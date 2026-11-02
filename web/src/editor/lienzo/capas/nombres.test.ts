import { describe, expect, it } from 'vitest'
import { ALTO_LINEA_PX, colocarNombres, type Etiqueta } from './nombres'

const etiqueta = (id: string, nombre: string, x: number, y: number, altura = 0): Etiqueta => ({ id, nombre, punto: { x, y }, altura })

describe('colocarNombres', () => {
  it('los nombres que no se pisan se quedan donde estaban', () => {
    const lejos = [etiqueta('a', 'Cama', 100, 100), etiqueta('b', 'Armario', 300, 100)]
    expect(colocarNombres(lejos, 1)).toEqual(lejos)
  })

  it('dos nombres en el mismo sitio van uno debajo del otro, el de la pieza más alta arriba', () => {
    const [lavabo, espejo] = colocarNombres([etiqueta('l', 'Lavabo', 200, 150, 0), etiqueta('e', 'Espejo', 202, 150, 110)], 1)
    expect(espejo!.punto.y).toBeLessThan(lavabo!.punto.y)
    expect(lavabo!.punto.y - espejo!.punto.y).toBeCloseTo(ALTO_LINEA_PX)
    // Repartidos alrededor del sitio de antes, sin moverse en horizontal.
    expect((lavabo!.punto.y + espejo!.punto.y) / 2).toBeCloseTo(150)
    expect(lavabo!.punto.x).toBe(200)
    expect(espejo!.punto.x).toBe(202)
  })

  it('la separación se mide en px de pantalla: con el plano acercado al doble, basta la mitad en cm', () => {
    const [a, b] = colocarNombres([etiqueta('a', 'Lavabo', 0, 0), etiqueta('b', 'Espejo', 0, 0, 1)], 2)
    expect(a!.punto.y - b!.punto.y).toBeCloseTo(ALTO_LINEA_PX / 2)
  })

  it('a 40 cm en un plano alejado se pisan; acercado, ya no', () => {
    const dos = [etiqueta('a', 'Mesita', 0, 0), etiqueta('b', 'Lámpara de pie', 40, 0)]
    expect(colocarNombres(dos, 0.5)[0]!.punto.y).not.toBe(0)
    expect(colocarNombres(dos, 3)).toEqual(dos)
  })

  it('tres nombres que se pisan en cadena se apilan los tres', () => {
    const tres = colocarNombres([etiqueta('a', 'Mesa', 0, 0, 0), etiqueta('b', 'Lámpara', 10, 0, 1), etiqueta('c', 'Cuadro', 20, 0, 2)], 1)
    const ys = tres.map((t) => t.punto.y).sort((p, q) => p - q)
    expect(ys[1]! - ys[0]!).toBeCloseTo(ALTO_LINEA_PX)
    expect(ys[2]! - ys[1]!).toBeCloseTo(ALTO_LINEA_PX)
  })
})
