import { describe, expect, it } from 'vitest'
import { aPantalla, aPlano, encuadrar, ESCALA_MAX, MARGEN_ENCUADRE_PX, pellizcar, zoomEn } from './vista'

const planta = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 330 }, { x: 0, y: 330 }]

describe('vista', () => {
  it('encuadrar centra la caja de la planta', () => {
    const v = encuadrar(planta, 800, 600, 48)
    const c = aPantalla(v, { x: 200, y: 165 })
    expect(c.x).toBeCloseTo(400)
    expect(c.y).toBeCloseTo(300)
    expect(v.escala).toBeCloseTo(504 / 330)
  })

  it('aPlano deshace aPantalla', () => {
    const v = { x: 37, y: -12, escala: 1.7 }
    const p = { x: 123.4, y: -56.7 }
    const q = aPlano(v, aPantalla(v, p))
    expect(q.x).toBeCloseTo(p.x)
    expect(q.y).toBeCloseTo(p.y)
  })

  it('zoomEn deja quieto el punto bajo el cursor', () => {
    const v = encuadrar(planta, 800, 600)
    const px = { x: 250, y: 410 }
    const v2 = zoomEn(v, 2, px)
    expect(v2.escala).toBeCloseTo(v.escala * 2)
    expect(aPlano(v2, px).x).toBeCloseTo(aPlano(v, px).x)
    expect(aPlano(v2, px).y).toBeCloseTo(aPlano(v, px).y)
  })

  it('zoomEn recorta la escala', () => {
    expect(zoomEn({ x: 0, y: 0, escala: 1 }, 1e6, { x: 10, y: 10 }).escala).toBe(ESCALA_MAX)
  })

  it('el margen por defecto deja sitio a las cotas, que van a 34 px del muro con el texto centrado en su línea', () => {
    expect(MARGEN_ENCUADRE_PX).toBeGreaterThanOrEqual(64)
    const v = encuadrar(planta, 390, 400)
    expect(aPantalla(v, { x: 0, y: 0 }).x).toBeCloseTo(MARGEN_ENCUADRE_PX)
  })

  it('pellizcar: separar los dedos al doble amplía al doble alrededor del punto medio', () => {
    const inicio = { x: 10, y: 20, escala: 1 }
    const v = pellizcar(inicio, [{ x: 100, y: 100 }, { x: 200, y: 100 }], [{ x: 50, y: 100 }, { x: 250, y: 100 }])
    expect(v.escala).toBeCloseTo(2)
    // El punto del plano que estaba bajo el punto medio (150, 100) sigue ahí.
    const p = aPlano(inicio, { x: 150, y: 100 })
    expect(aPantalla(v, p).x).toBeCloseTo(150)
    expect(aPantalla(v, p).y).toBeCloseTo(100)
  })

  it('pellizcar: mover los dos dedos a la vez desplaza el plano con ellos', () => {
    const inicio = { x: 0, y: 0, escala: 1.5 }
    const v = pellizcar(inicio, [{ x: 100, y: 100 }, { x: 200, y: 100 }], [{ x: 130, y: 60 }, { x: 230, y: 60 }])
    expect(v).toEqual({ x: 30, y: -40, escala: 1.5 })
  })

  it('pellizcar: respeta los límites de escala y no se rompe con los dedos juntos', () => {
    const v = pellizcar({ x: 0, y: 0, escala: ESCALA_MAX }, [{ x: 0, y: 0 }, { x: 10, y: 0 }], [{ x: 0, y: 0 }, { x: 100, y: 0 }])
    expect(v.escala).toBe(ESCALA_MAX)
    const juntos = pellizcar({ x: 0, y: 0, escala: 1 }, [{ x: 5, y: 5 }, { x: 5, y: 5 }], [{ x: 0, y: 0 }, { x: 10, y: 0 }])
    expect(Number.isFinite(juntos.escala)).toBe(true)
  })
})
