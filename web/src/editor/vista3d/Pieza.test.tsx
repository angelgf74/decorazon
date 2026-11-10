import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { BoxGeometry, BufferGeometry } from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Pieza3D, Vec3 } from '../../nucleo'
import Pieza from './Pieza'

// `Edges` guarda la geometría que recibe: es lo único que importa aquí.
const sonda: { geometria?: BufferGeometry; umbral?: number; montajes: number } = { montajes: 0 }
vi.mock('@react-three/drei', () => ({
  Edges: ({ geometry, threshold }: { geometry?: BufferGeometry; threshold?: number }) => {
    sonda.geometria = geometry
    sonda.umbral = threshold
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
  sonda.umbral = undefined
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

describe('Pieza: revolución, extrusión y tubo', () => {
  const comun = { material: 'metal' as const, color: '#3a3a3a', origen: [1, 0.2, 2] as Vec3, giroY: 0.7 }
  const formas: Pieza3D[] = [
    { ...comun, forma: 'revolucion', centro: [0.05, 0], perfil: [[0, 0], [0.1, 0], [0.05, 0.3], [0, 0.3]], lados: 24, escalaY: 1 },
    { ...comun, forma: 'extrusion', plano: 'alzado', contorno: [[-0.1, 0], [0.1, 0], [0, 0.2]], huecos: [], desde: -0.01, hasta: 0.01 },
    { ...comun, forma: 'tubo', puntos: [[0, 0, 0], [0, 0, 0.4], [0.2, 0, 0.4]], radio: 0.015, codo: 0.05, cerrado: false },
  ]

  for (const pieza of formas) {
    it(`${pieza.forma}: una malla en el origen del mueble, girada con él, con la geometría que da \`geometrias\``, async () => {
      const r = await ReactThreeTestRenderer.create(<Pieza pieza={pieza} />)
      const malla = r.scene.findAll((n) => n.type === 'Mesh')[0]!.instance as unknown as { position: { toArray(): number[] }; rotation: { y: number }; geometry: BufferGeometry }
      expect(malla.position.toArray()).toEqual([1, 0.2, 2])
      expect(malla.rotation.y).toBeCloseTo(0.7)
      expect(malla.geometry.getAttribute('position').count).toBeGreaterThan(0)
      expect(malla.geometry.getAttribute('uv')).toBeDefined()
    })
  }

  it('seleccionada, el contorno no pinta las facetas: solo los pliegues de más de 35°', async () => {
    await geometriaDe(formas[0]!, true)
    expect(sonda.montajes).toBe(1)
    expect(sonda.umbral).toBe(35)
  })
})
