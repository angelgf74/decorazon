// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Vec3 } from '../../nucleo'
import SombrasSuaves, { ALTURA_PLANO_M, DISTANCIA_LUCES_M, PASOS_SOMBRA } from './SombrasSuaves'

// Dobles de drei: guardan las props con las que se montan y cuentan los montajes (para vigilar el `memo`).
const sonda = vi.hoisted(() => ({ plano: {} as Record<string, unknown>, luz: {} as Record<string, unknown>, montajes: 0 }))
vi.mock('@react-three/drei', () => ({
  AccumulativeShadows: ({ children, ...props }: { children?: unknown } & Record<string, unknown>) => {
    sonda.plano = props
    sonda.montajes++
    return <div data-plano>{children as never}</div>
  },
  RandomizedLight: (props: Record<string, unknown>) => {
    sonda.luz = props
    return <div data-luz />
  },
}))

const centro: Vec3 = [2, 0, 1.65]
const sol: Vec3 = [-0.5, 0.7, -0.5]
const radio = 3.2

beforeEach(() => {
  sonda.montajes = 0
})

describe('SombrasSuaves', () => {
  it('un plano de sombras acumuladas a ras de suelo, centrado y del tamaño de la estancia, horneado de una vez (sin temporal)', () => {
    render(<SombrasSuaves centro={centro} radio={radio} sol={sol} />)
    expect(sonda.plano.position).toEqual([2, ALTURA_PLANO_M, 1.65])
    expect(sonda.plano.scale).toBe(2 * radio)
    expect(sonda.plano.frames).toBe(PASOS_SOMBRA)
    expect(sonda.plano.temporal).toBeUndefined()
    expect(sonda.plano.opacity).toBeGreaterThan(0.5)
  })

  it('las luces salen de la dirección del sol, lejos, y su cámara de sombras abarca la estancia', () => {
    render(<SombrasSuaves centro={centro} radio={radio} sol={sol} />)
    const posicion = sonda.luz.position as Vec3
    posicion.forEach((v, k) => expect(v).toBeCloseTo(sol[k]! * DISTANCIA_LUCES_M))
    const size = sonda.luz.size as number
    expect(size).toBeCloseTo(Math.hypot(...centro) + radio + 1)
    expect((sonda.luz.near as number) + (sonda.luz.far as number)).toBeCloseTo(2 * DISTANCIA_LUCES_M)
    expect(sonda.luz.amount).toBeGreaterThanOrEqual(4)
    expect(sonda.luz.ambient).toBeGreaterThan(0)
  })

  it('con las mismas props no se vuelve a montar: el horneado de drei se repetiría en cada render', () => {
    const { rerender } = render(<SombrasSuaves centro={centro} radio={radio} sol={sol} />)
    expect(sonda.montajes).toBe(1)
    rerender(<SombrasSuaves centro={[2, 0, 1.65]} radio={3.2} sol={[-0.5, 0.7, -0.5]} />)
    expect(sonda.montajes).toBe(1)
    rerender(<SombrasSuaves centro={[2, 0, 1.65]} radio={4} sol={[-0.5, 0.7, -0.5]} />)
    expect(sonda.montajes).toBe(2)
  })
})
