// @vitest-environment jsdom
import { render } from '@testing-library/react'
import type { Mesh } from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Punto, Vec3 } from '../../nucleo'
import SombrasSuaves, { ALTURA_PLANO_M, DISTANCIA_LUCES_M, PASOS_SOMBRA } from './SombrasSuaves'

// Dobles de drei: guardan las props con las que se montan, cuentan los montajes (para vigilar el `memo`) y dan el plano
// receptor por el contexto, como hace AccumulativeShadows.
const sonda = vi.hoisted(() => ({
  plano: {} as Record<string, unknown>, luz: {} as Record<string, unknown>, montajes: 0, malla: null as unknown,
  horneados: [] as string[], reinicios: 0,
}))
vi.mock('@react-three/drei', async () => {
  const { createContext } = await import('react')
  const { Mesh, PlaneGeometry } = await import('three')
  const malla = new Mesh(new PlaneGeometry())
  sonda.malla = malla
  // Lo que usa el receptor del api de drei: la malla, reiniciar y hornear n pasos (se apunta con qué geometría).
  const accumulativeContext = createContext({
    getMesh: () => malla,
    blend: 24,
    reset: () => { sonda.reinicios++ },
    update: (n: number) => { sonda.horneados.push(`${malla.geometry.type}:${n}`) },
  })
  return {
    accumulativeContext,
    AccumulativeShadows: ({ children, ...props }: { children?: unknown } & Record<string, unknown>) => {
      sonda.plano = props
      sonda.montajes++
      return <div data-plano>{children as never}</div>
    },
    RandomizedLight: (props: Record<string, unknown>) => {
      sonda.luz = props
      return <div data-luz />
    },
  }
})
const planta: Punto[] = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 330 }, { x: 0, y: 330 }]
const centro: Vec3 = [2, 0, 1.65]
const sol: Vec3 = [-0.5, 0.7, -0.5]
const radio = 3.2
const montar = () => render(<SombrasSuaves planta={planta} centro={centro} radio={radio} sol={sol} />)

beforeEach(() => {
  sonda.montajes = 0
  sonda.reinicios = 0
  sonda.horneados = []
})

describe('SombrasSuaves', () => {
  it('un receptor de sombras acumuladas a ras de suelo, centrado y sin escala (la geometría ya va en metros), horneado de una vez', () => {
    montar()
    expect(sonda.plano.position).toEqual([2, ALTURA_PLANO_M, 1.65])
    expect(sonda.plano.scale).toBe(1)
    expect(sonda.plano.frames).toBe(PASOS_SOMBRA)
    expect(sonda.plano.temporal).toBeUndefined()
    expect(sonda.plano.opacity).toBeGreaterThan(0.5)
  })

  it('el receptor es la planta, no el plano de drei, y se rehornea con ella: las sombras no caen fuera de la estancia', () => {
    montar()
    const malla = sonda.malla as Mesh
    expect(malla.geometry.type).toBe('ShapeGeometry')
    malla.geometry.computeBoundingBox()
    const b = malla.geometry.boundingBox!
    expect([b.min.x, b.max.x, b.min.y, b.max.y].map((v) => Number(v.toFixed(6)))).toEqual([-2, 2, -1.65, 1.65])
    expect(sonda.reinicios).toBe(1)
    expect(sonda.horneados).toEqual(['ShapeGeometry:24'])
    // El horneado desenvuelve por uv: descartar el receptor por su caja envolvente dejaba el mapa vacío (suelo negro).
    expect(malla.frustumCulled).toBe(false)
  })

  it('las luces salen de la dirección del sol, lejos, y su cámara de sombras abarca la estancia', () => {
    montar()
    const posicion = sonda.luz.position as Vec3
    posicion.forEach((v, k) => expect(v).toBeCloseTo(sol[k]! * DISTANCIA_LUCES_M))
    const size = sonda.luz.size as number
    expect(size).toBeCloseTo(Math.hypot(...centro) + radio + 1)
    expect((sonda.luz.near as number) + (sonda.luz.far as number)).toBeCloseTo(2 * DISTANCIA_LUCES_M)
    expect(sonda.luz.amount).toBeGreaterThanOrEqual(4)
    expect(sonda.luz.ambient).toBeGreaterThan(0)
  })

  it('con las mismas props (aunque sean arrays nuevos) no se vuelve a montar: el horneado de drei se repetiría en cada render', () => {
    const { rerender } = montar()
    expect(sonda.montajes).toBe(1)
    rerender(<SombrasSuaves planta={planta.map((p) => ({ ...p }))} centro={[2, 0, 1.65]} radio={3.2} sol={[-0.5, 0.7, -0.5]} />)
    expect(sonda.montajes).toBe(1)
    rerender(<SombrasSuaves planta={planta} centro={[2, 0, 1.65]} radio={4} sol={[-0.5, 0.7, -0.5]} />)
    expect(sonda.montajes).toBe(2)
  })
})
