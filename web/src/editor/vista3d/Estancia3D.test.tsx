import ReactThreeTestRenderer from '@react-three/test-renderer'
import { Box3 } from 'three'
import { describe, expect, it } from 'vitest'
import { documentoNuevo, escenaEstancia } from '../../nucleo'
import Estancia3D from './Estancia3D'
import { geometriaPrisma, geometriaSuelo } from './geometrias'

describe('Estancia3D', () => {
  it('una malla por suelo, trozo de muro, pieza de hueco y estructura', async () => {
    const doc = documentoNuevo('salon', 400, 330, 250)
    doc.aberturas.push({ id: 'p1', tipo: 'puerta', pared: 0, posicion: 159, ancho: 82, alto: 203, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' })
    const { muros, huecos, estructura } = escenaEstancia(doc)
    const r = await ReactThreeTestRenderer.create(<Estancia3D doc={doc} />)
    const mallas = r.scene.findAll((n) => n.type === 'Mesh')
    expect(mallas).toHaveLength(muros.length + huecos.length + estructura.length + 1)
    for (const m of mallas) {
      expect(m.props.castShadow || m.props.receiveShadow).toBe(true)
    }
  })
})

describe('geometrías', () => {
  it('el prisma cae en x/z de su huella y de y0 a y1', () => {
    const g = geometriaPrisma([[1, 2], [3, 2], [3, 2.5], [1, 2.5]], 0.5, 2.1)
    g.computeBoundingBox()
    const b = g.boundingBox as Box3
    expect(b.min.x).toBeCloseTo(1)
    expect(b.max.x).toBeCloseTo(3)
    expect(b.min.y).toBeCloseTo(0.5)
    expect(b.max.y).toBeCloseTo(2.1)
    expect(b.min.z).toBeCloseTo(2)
    expect(b.max.z).toBeCloseTo(2.5)
  })

  it('el suelo es la planta en metros a y = 0 y mira hacia arriba', () => {
    const g = geometriaSuelo([{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 330 }, { x: 0, y: 330 }])
    g.computeBoundingBox()
    const b = g.boundingBox as Box3
    expect([b.min.x, b.max.x, b.min.z, b.max.z]).toEqual([0, 4, 0, 3.3].map((v) => expect.closeTo(v)))
    expect(b.min.y).toBeCloseTo(0)
    expect(b.max.y).toBeCloseTo(0)
    expect(g.getAttribute('normal').getY(0)).toBeCloseTo(1)
  })
})
