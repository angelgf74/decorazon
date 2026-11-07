import { describe, expect, it } from 'vitest'
import { catalogoBase } from '../catalogo/catalogoBase'
import { elementoNuevo } from '../catalogo/elemento'
import { documentoNuevo } from '../modelo/crear'
import type { Ventana } from '../modelo/documento'
import { lucesInteriores, MAXIMO_LAMPARAS, MAXIMO_VENTANAS } from './luces'

const ventana = (id: string, pared: number, posicion = 100): Ventana =>
  ({ id, tipo: 'ventana', pared, posicion, ancho: 120, alto: 120, alturaSuelo: 90, abreHaciaDentro: true })

describe('luces interiores (M-13)', () => {
  it('una lámpara de pie da una luz cálida bajo la pantalla, en metros de escena', () => {
    const doc = documentoNuevo('salon', 400, 300, 250)
    doc.elementos = [{ ...elementoNuevo(catalogoBase.get('lampara-pie')!, { x: 100, y: 200 }, 'l'), medidas: { ancho: 40, fondo: 40, alto: 160 } }]
    const [luz] = lucesInteriores(doc)
    expect(luz).toMatchObject({ tipo: 'lampara' })
    expect(luz!.posicion[0]).toBeCloseTo(1)
    expect(luz!.posicion[1]).toBeCloseTo(1.45)
    expect(luz!.posicion[2]).toBeCloseTo(2)
  })

  it('una ventana da una luz suave en su centro, un poco hacia dentro de la estancia', () => {
    const doc = documentoNuevo('salon', 400, 300, 250)
    // Pared 0: la de arriba, de (0,0) a (400,0); dentro es y > 0.
    doc.aberturas = [ventana('v', 0, 100)]
    const [luz] = lucesInteriores(doc)
    expect(luz).toMatchObject({ tipo: 'ventana' })
    expect(luz!.posicion[0]).toBeCloseTo(1.6)
    expect(luz!.posicion[1]).toBeCloseTo(1.5)
    expect(luz!.posicion[2]).toBeGreaterThan(0.1)
  })

  it(`hay un tope: como mucho ${4} lámparas y ${3} ventanas (cada luz más es más trabajo por fotograma)`, () => {
    const doc = documentoNuevo('salon', 800, 600, 250)
    doc.elementos = Array.from({ length: MAXIMO_LAMPARAS + 3 }, (_, i) => elementoNuevo(catalogoBase.get('lampara-pie')!, { x: 50 + i * 60, y: 300 }, `l${i}`))
    doc.aberturas = Array.from({ length: MAXIMO_VENTANAS + 2 }, (_, i) => ventana(`v${i}`, 0, 20 + i * 150))
    const luces = lucesInteriores(doc)
    expect(luces.filter((l) => l.tipo === 'lampara')).toHaveLength(MAXIMO_LAMPARAS)
    expect(luces.filter((l) => l.tipo === 'ventana')).toHaveLength(MAXIMO_VENTANAS)
  })

  it('sin lámparas ni ventanas, ninguna', () => {
    expect(lucesInteriores(documentoNuevo('salon', 400, 300, 250))).toEqual([])
  })
})
