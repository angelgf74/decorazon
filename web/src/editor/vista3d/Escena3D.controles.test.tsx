import ReactThreeTestRenderer from '@react-three/test-renderer'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Vector3 } from 'three'
import type { OrbitControls as Controles } from 'three-stdlib'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { camaraDesdeDentro, documentoNuevo, type DocumentoDiseno } from '../../nucleo'
import { reiniciarAlmacen } from '../estado/almacen'
import Escena3D from './Escena3D'

// Los OrbitControls de verdad (el estado de su instancia es lo que se comprueba); lo demás de drei, falseado.
vi.mock('@react-three/drei', async (original) => {
  const real = await original<typeof import('@react-three/drei')>()
  return { ...real, Edges: () => null, Environment: () => null, Lightformer: () => null }
})

const sonda = { controles: undefined as unknown as Controles }
function Sonda() {
  const controles = useThree((e) => e.controls)
  useEffect(() => {
    sonda.controles = controles as unknown as Controles
  }, [controles])
  return null
}

const escena = (doc: DocumentoDiseno, desdeDentro: boolean) => (
  <>
    <Escena3D doc={doc} ocultar encuadres={0} desdeDentro={desdeDentro} />
    <Sonda />
  </>
)

function documento() {
  const doc = documentoNuevo('salon', 400, 330, 250)
  doc.aberturas.push({ id: 'p1', tipo: 'puerta', pared: 0, posicion: 159, ancho: 82, alto: 203, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' })
  return doc
}

beforeEach(() => reiniciarAlmacen())

describe('Escena3D con los OrbitControls reales', () => {
  it('tras entrar y salir de «Desde dentro», la órbita de fuera sigue girando, con zoom y desplazamiento', async () => {
    const doc = documento()
    const r = await ReactThreeTestRenderer.create(escena(doc, false))
    const c = sonda.controles
    expect(c).toBeDefined()
    expect([c.enableZoom, c.enablePan, c.rotateSpeed]).toEqual([true, true, 1])
    await r.update(escena(doc, true))
    expect(sonda.controles).toBe(c)
    expect([c.enableZoom, c.enablePan, c.rotateSpeed, c.minDistance, c.maxDistance]).toEqual([false, false, 0.5, 0.01, 0.01])
    await r.update(escena(doc, false))
    expect([c.enableZoom, c.enablePan, c.rotateSpeed]).toEqual([true, true, 1])
    expect(c.minDistance).toBe(1)
    expect(c.maxDistance).toBeGreaterThan(1)
  })

  it('desde dentro, girar no mueve la cámara (menos de 2 cm): es girar la cabeza, no andar', async () => {
    const doc = documento()
    await ReactThreeTestRenderer.create(escena(doc, true))
    const c = sonda.controles
    const antes = c.object.position.clone()
    expect(antes.toArray().map((v) => Number(v.toFixed(3)))).toEqual(camaraDesdeDentro(doc).posicion.map((v) => Number(v.toFixed(3))))
    // Un giro de 90° alrededor del objetivo, como haría un arrastre: los controles acotan la distancia a su radio.
    const desplazada = antes.clone().sub(c.target).applyAxisAngle(new Vector3(0, 1, 0), Math.PI / 2).add(c.target)
    c.object.position.copy(desplazada)
    c.update()
    expect(c.object.position.distanceTo(antes)).toBeLessThan(0.02)
    expect(c.object.position.distanceTo(c.target)).toBeCloseTo(0.01)
  })
})
