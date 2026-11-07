import { describe, expect, it } from 'vitest'
import { areaConSigno, esSimple } from '../geometria/poligono'
import { documentoNuevo, plantaDeForma, type FormaDePlanta } from './crear'
import { validarDocumento } from './validar'

describe('documentoNuevo', () => {
  it('crea una planta rectangular y es válido', () => {
    const d = documentoNuevo('dormitorio', 400, 330, 250)
    expect(d.estancia.planta).toEqual([
      { x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 330 }, { x: 0, y: 330 },
    ])
    expect(d.estancia.alto).toBe(250)
    expect(d.estancia.grosorPared).toBe(10)
    expect(validarDocumento(d).valido).toBe(true)
  })

  it('con forma en L, la planta tiene 6 vértices y es válida', () => {
    const ele: FormaDePlanta = { forma: 'ele', entranteAncho: 150, entranteLargo: 100, esquina: 'abajo-derecha' }
    const d = documentoNuevo('salon', 400, 330, 250, ele)
    expect(d.estancia.planta).toHaveLength(6)
    expect(validarDocumento(d).valido).toBe(true)
    expect(esSimple(d.estancia.planta)).toBe(true)
  })
})

describe('plantaDeForma', () => {
  it('rectángulo: los 4 vértices de siempre', () => {
    expect(plantaDeForma(400, 330, { forma: 'rectangulo' })).toEqual([{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 330 }, { x: 0, y: 330 }])
  })

  it('L con el entrante abajo a la derecha: 6 vértices en sentido horario (x a la derecha, y hacia abajo)', () => {
    const planta = plantaDeForma(400, 330, { forma: 'ele', entranteAncho: 150, entranteLargo: 100, esquina: 'abajo-derecha' })
    expect(planta).toEqual([{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 230 }, { x: 250, y: 230 }, { x: 250, y: 330 }, { x: 0, y: 330 }])
    expect(areaConSigno(planta)).toBe(areaConSigno(plantaDeForma(400, 330, { forma: 'rectangulo' })) > 0 ? 400 * 330 - 150 * 100 : -(400 * 330 - 150 * 100))
  })

  it('cada esquina recorta la suya, con la misma superficie', () => {
    const esquinas = ['arriba-izquierda', 'arriba-derecha', 'abajo-izquierda', 'abajo-derecha'] as const
    const plantas = esquinas.map((esquina) => plantaDeForma(400, 330, { forma: 'ele', entranteAncho: 150, entranteLargo: 100, esquina }))
    for (const p of plantas) {
      expect(p).toHaveLength(6)
      expect(esSimple(p)).toBe(true)
      expect(Math.abs(areaConSigno(p))).toBe(400 * 330 - 150 * 100)
    }
    expect(plantas[0]).toContainEqual({ x: 150, y: 100 })
    expect(plantas[1]).toContainEqual({ x: 250, y: 100 })
    expect(plantas[2]).toContainEqual({ x: 150, y: 230 })
    expect(plantas[3]).toContainEqual({ x: 250, y: 230 })
    // Las cuatro giran en el mismo sentido que el rectángulo.
    expect(new Set(plantas.map((p) => Math.sign(areaConSigno(p))))).toEqual(new Set([Math.sign(areaConSigno(plantaDeForma(400, 330, { forma: 'rectangulo' })))]))
  })

  it('un entrante más grande que la estancia se recorta: quedan al menos 50 cm de cada lado', () => {
    const planta = plantaDeForma(400, 330, { forma: 'ele', entranteAncho: 390, entranteLargo: 400, esquina: 'abajo-derecha' })
    expect(planta).toContainEqual({ x: 50, y: 50 })
    expect(esSimple(planta)).toBe(true)
    const minimo = plantaDeForma(400, 330, { forma: 'ele', entranteAncho: 1, entranteLargo: -5, esquina: 'abajo-derecha' })
    expect(minimo).toContainEqual({ x: 350, y: 280 })
  })
})
