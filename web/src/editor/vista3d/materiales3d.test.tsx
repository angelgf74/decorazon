import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { MeshPhysicalMaterial } from 'three'
import { describe, expect, it } from 'vitest'
import type { Vec3 } from '../../nucleo'
import { LIMITE_MATERIALES, materialDe, materialesEnCache } from './materiales3d'
import Pieza from './Pieza'

describe('materialDe', () => {
  it('el vidrio (placa, horno) es oscuro y opaco: ni transparente ni emisivo', () => {
    const m = materialDe('vidrio', '#1f1f1f') as MeshPhysicalMaterial
    expect(m.transparent).toBe(false)
    expect(m.emissive.getHexString()).toBe('000000')
    expect(m.roughness).toBe(0.05)
  })

  it('el cristal de ventana es transparente y deja pasar luz cálida', () => {
    const m = materialDe('cristal', '#cfe3ea') as MeshPhysicalMaterial
    expect(m.transparent).toBe(true)
    expect(m.opacity).toBe(0.25)
    expect(m.emissive.getHexString()).toBe('fff6e0')
    expect(m.emissiveIntensity).toBe(0.4)
  })
})

describe('materialDe: mampara', () => {
  it('el cristal de mampara es transparente pero no brilla como una ventana', () => {
    const m = materialDe('mampara', '#dcebef') as MeshPhysicalMaterial
    expect(m.transparent).toBe(true)
    expect(m.opacity).toBe(0.3)
    expect(m.emissive.getHexString()).toBe('000000')
  })
})

describe('Pieza: sombras', () => {
  const caja = { forma: 'caja' as const, centro: [0, 0, 0] as Vec3, tamano: [1, 1, 1] as Vec3, giroY: 0 }

  it('el vidrio proyecta sombra y el cristal no', async () => {
    const vidrio = await ReactThreeTestRenderer.create(<Pieza pieza={{ ...caja, material: 'vidrio', color: '#1f1f1f' }} />)
    expect(vidrio.scene.findAll((n) => n.type === 'Mesh')[0]!.instance.castShadow).toBe(true)
    const cristal = await ReactThreeTestRenderer.create(<Pieza pieza={{ ...caja, material: 'cristal', color: '#cfe3ea' }} />)
    expect(cristal.scene.findAll((n) => n.type === 'Mesh')[0]!.instance.castShadow).toBe(false)
  })

  it('arrastrar el selector de color no llena la caché: guarda como mucho el límite y libera los menos usados', () => {
    const primero = materialDe('madera', '#000001')
    let liberado = false
    primero.addEventListener('dispose', () => { liberado = true })
    const usado = materialDe('madera', '#000002')
    for (let n = 3; n < LIMITE_MATERIALES + 50; n++) {
      materialDe('madera', '#' + n.toString(16).padStart(6, '0'))
      // Uno que se sigue usando no sale de la caché.
      materialDe('madera', '#000002')
    }
    expect(materialesEnCache()).toBeLessThanOrEqual(LIMITE_MATERIALES)
    expect(liberado).toBe(true)
    expect(materialDe('madera', '#000002')).toBe(usado)
  })
})
