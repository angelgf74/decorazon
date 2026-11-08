import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { Mesh } from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { documentoNuevo } from '../../nucleo'
import { reiniciarAlmacen } from '../estado/almacen'
import Escena3D from './Escena3D'

vi.mock('@react-three/drei', () => ({ Edges: () => null, Environment: () => null, Lightformer: () => null, OrbitControls: () => null }))
vi.mock('./SombrasSuaves', () => ({ default: () => <group name="sombras-suaves" /> }))

beforeEach(() => reiniciarAlmacen())

const doc = () => documentoNuevo('salon', 400, 330, 250)

/** El suelo es la única malla con ShapeGeometry. */
const suelo = (r: Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>) =>
  r.scene.findAll((n) => n.type === 'Mesh').map((n) => n.instance as unknown as Mesh).find((m) => m.geometry.type === 'ShapeGeometry')!

describe('Escena3D: sombras duras o suaves', () => {
  it('por defecto (vista interactiva) no hay sombras suaves y el suelo recibe la sombra dura del sol', async () => {
    const r = await ReactThreeTestRenderer.create(<Escena3D doc={doc()} ocultar encuadres={0} />)
    expect(r.scene.findAll((n) => n.instance.name === 'sombras-suaves')).toHaveLength(0)
    expect(suelo(r).receiveShadow).toBe(true)
    expect(r.scene.findAll((n) => n.type === 'DirectionalLight')[0]!.instance.castShadow).toBe(true)
  })

  it('con sombras="suaves" se monta el plano acumulado y el suelo deja de recibir la dura (si no, saldría el núcleo duro dentro del halo)', async () => {
    const r = await ReactThreeTestRenderer.create(<Escena3D doc={doc()} ocultar encuadres={0} sombras="suaves" />)
    expect(r.scene.findAll((n) => n.instance.name === 'sombras-suaves')).toHaveLength(1)
    expect(suelo(r).receiveShadow).toBe(false)
    // Paredes y muebles siguen recibiendo la del sol: el sol sigue proyectando.
    expect(r.scene.findAll((n) => n.type === 'DirectionalLight')[0]!.instance.castShadow).toBe(true)
  })
})
