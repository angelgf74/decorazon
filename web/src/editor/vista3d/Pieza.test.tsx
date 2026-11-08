import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { BoxGeometry, BufferGeometry } from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Pieza3D } from '../../nucleo'
import Pieza from './Pieza'

// `Edges` guarda la geometría que recibe: es lo único que importa aquí.
const sonda: { geometria?: BufferGeometry; montajes: number } = { montajes: 0 }
vi.mock('@react-three/drei', () => ({
  Edges: ({ geometry }: { geometry?: BufferGeometry }) => {
    sonda.geometria = geometry
    sonda.montajes++
    return null
  },
}))

const cajaDe = (radio?: number): Pieza3D => ({
  forma: 'caja', material: 'tela', color: '#8a8f99', centro: [1, 0.3, 2], tamano: [0.6, 0.12, 0.5], giroY: 0, ...(radio === undefined ? {} : { radio }),
})

const geometriaDe = async (pieza: Pieza3D, contorno: boolean) => {
  const r = await ReactThreeTestRenderer.create(<Pieza pieza={pieza} contorno={contorno} />)
  const malla = r.scene.findAll((n) => n.type === 'Mesh')[0]!
  return (malla.instance as unknown as { geometry: BufferGeometry }).geometry
}

beforeEach(() => {
  sonda.geometria = undefined
  sonda.montajes = 0
})

describe('Pieza: cajas con radio', () => {
  it('sin radio es una BoxGeometry de siempre', async () => {
    expect((await geometriaDe(cajaDe(), false)).type).toBe('BoxGeometry')
  })

  it('con radio se pinta con RoundedBoxGeometry y, seleccionada, el contorno se calcula sobre la caja lisa del mismo tamaño', async () => {
    expect((await geometriaDe(cajaDe(0.05), false)).type).toBe('RoundedBoxGeometry')
    expect(sonda.montajes).toBe(0)
    await geometriaDe(cajaDe(0.05), true)
    expect(sonda.montajes).toBe(1)
    expect(sonda.geometria?.type).toBe('BoxGeometry')
    const { width, height, depth } = (sonda.geometria as BoxGeometry).parameters
    expect([width, height, depth]).toEqual([0.6, 0.12, 0.5])
  })

  it('sin radio, el contorno usa la geometría de la propia malla (no recibe otra)', async () => {
    await geometriaDe(cajaDe(), true)
    expect(sonda.montajes).toBe(1)
    expect(sonda.geometria).toBeUndefined()
  })
})
