import ReactThreeTestRenderer from '@react-three/test-renderer'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { Camera } from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { camaraInicial, documentoNuevo, escenaEstancia, type DocumentoDiseno } from '../../nucleo'
import { reiniciarAlmacen } from '../estado/almacen'
import Escena3D from './Escena3D'

const controles = vi.hoisted(() => ({ onChange: undefined as (() => void) | undefined }))

vi.mock('@react-three/drei', () => ({
  Environment: () => null,
  Lightformer: () => null,
  OrbitControls: ({ onChange }: { onChange?: () => void }) => {
    controles.onChange = onChange
    return null
  },
}))

const sonda = { camara: undefined as unknown as Camera }
function Sonda() {
  const camara = useThree((e) => e.camera)
  useEffect(() => {
    sonda.camara = camara
  }, [camara])
  return null
}

const escena = (doc: DocumentoDiseno, ocultar: boolean, encuadres = 0) => (
  <>
    <Escena3D doc={doc} ocultar={ocultar} encuadres={encuadres} />
    <Sonda />
  </>
)

const contarMallas = (r: Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>) =>
  r.scene.findAll((n) => n.type === 'Mesh').length

function documento() {
  const doc = documentoNuevo('salon', 400, 330, 250)
  doc.aberturas.push({ id: 'p1', tipo: 'puerta', pared: 0, posicion: 159, ancho: 82, alto: 203, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' })
  doc.aberturas.push({ id: 'v1', tipo: 'ventana', pared: 2, posicion: 50, ancho: 100, alto: 120, alturaSuelo: 90, abreHaciaDentro: false })
  return doc
}

/** Mallas esperadas: suelo, estructura y los muros y huecos de las paredes no ocultas. */
function esperadas(doc: DocumentoDiseno, ocultas: number[]): number {
  const { muros, huecos, estructura } = escenaEstancia(doc)
  const visibles = (p: { pared: number }) => !ocultas.includes(p.pared)
  return 1 + estructura.length + muros.filter(visibles).length + huecos.filter(visibles).length
}

beforeEach(() => {
  reiniciarAlmacen()
  controles.onChange = undefined
})

describe('Escena3D: paredes que tapan', () => {
  it('con ocultar activado omite las paredes entre la cámara inicial y la estancia (2 y 3)', async () => {
    const doc = documento()
    const r = await ReactThreeTestRenderer.create(escena(doc, true))
    expect(sonda.camara.position.toArray()).toEqual(camaraInicial(doc).posicion)
    expect(contarMallas(r)).toBe(esperadas(doc, [2, 3]))
    expect(contarMallas(r)).toBeLessThan(esperadas(doc, []))
  })

  it('con ocultar desactivado salen todas, y al activarlo se vuelven a omitir', async () => {
    const doc = documento()
    const r = await ReactThreeTestRenderer.create(escena(doc, false))
    expect(contarMallas(r)).toBe(esperadas(doc, []))
    await r.update(escena(doc, true))
    expect(contarMallas(r)).toBe(esperadas(doc, [2, 3]))
    await r.update(escena(doc, false))
    expect(contarMallas(r)).toBe(esperadas(doc, []))
  })

  it('al orbitar (evento change) se recalculan: cámara detrás de la pared 0, solo esa se omite', async () => {
    const doc = documento()
    const r = await ReactThreeTestRenderer.create(escena(doc, true))
    sonda.camara.position.set(2, 2, -10)
    await ReactThreeTestRenderer.act(async () => controles.onChange?.())
    expect(contarMallas(r)).toBe(esperadas(doc, [0]))
  })
})

describe('Escena3D: encuadrar', () => {
  it('al cambiar `encuadres` la cámara vuelve a camaraInicial; sin cambio no se mueve', async () => {
    const doc = documento()
    const r = await ReactThreeTestRenderer.create(escena(doc, true, 0))
    sonda.camara.position.set(2, 2, -10)
    await r.update(escena(doc, true, 0))
    expect(sonda.camara.position.toArray()).toEqual([2, 2, -10])
    await r.update(escena(doc, true, 1))
    expect(sonda.camara.position.toArray()).toEqual(camaraInicial(doc).posicion)
  })
})
