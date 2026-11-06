import ReactThreeTestRenderer from '@react-three/test-renderer'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Vector3, type Camera, type DirectionalLight } from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { camaraDesdeDentro, camaraInicial, documentoNuevo, escenaEstancia, type DocumentoDiseno, type Vec3 } from '../../nucleo'
import { reiniciarAlmacen } from '../estado/almacen'
import Escena3D from './Escena3D'

/** Controles de prueba: lo que Escena3D usa de OrbitControls (objetivo, update y el evento change). */
interface ControlesFalsos { target: Vector3; update(): void }

const controles = vi.hoisted(() => ({
  onChange: undefined as (() => void) | undefined,
  instancia: undefined as unknown as ControlesFalsos,
  /** Las últimas props que recibió OrbitControls (zoom, desplazamiento, distancias…). */
  props: {} as Record<string, unknown>,
}))

/** Veces que se monta el Environment: drei pinta sus Lightformer solo al montarlo. */
const entorno = vi.hoisted(() => ({ montajes: 0 }))

vi.mock('@react-three/drei', async () => {
  const { useImperativeHandle, useState } = await import('react')
  return {
    Edges: () => null,
    Environment: () => {
      useState(() => entorno.montajes++)
      return null
    },
    Lightformer: () => null,
    OrbitControls: ({ onChange, target, ref, ...resto }: { onChange?: () => void; target: Vec3; ref?: import('react').Ref<ControlesFalsos> } & Record<string, unknown>) => {
      controles.onChange = onChange
      controles.props = resto
      useState(() => controles.instancia.target.set(...target))
      useImperativeHandle(ref, () => controles.instancia, [])
      return null
    },
  }
})

const sonda = { camara: undefined as unknown as Camera }
function Sonda() {
  const camara = useThree((e) => e.camera)
  useEffect(() => {
    sonda.camara = camara
  }, [camara])
  return null
}

const escena = (doc: DocumentoDiseno, ocultar: boolean, encuadres = 0, desdeDentro = false) => (
  <>
    <Escena3D doc={doc} ocultar={ocultar} encuadres={encuadres} desdeDentro={desdeDentro} />
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
  controles.instancia = { target: new Vector3(), update: () => {} }
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

describe('Escena3D: desde dentro', () => {
  const redondeado = (v: Vec3 | number[]) => v.map((x) => Number(x.toFixed(6)))

  it('con desdeDentro la cámara y el objetivo van a camaraDesdeDentro; los controles sin zoom ni desplazamiento y a 1 m fijo', async () => {
    const doc = documento()
    const r = await ReactThreeTestRenderer.create(escena(doc, true))
    expect(controles.props['enableZoom']).not.toBe(false)
    await r.update(escena(doc, true, 0, true))
    const dentro = camaraDesdeDentro(doc)
    expect(redondeado(sonda.camara.position.toArray())).toEqual(redondeado(dentro.posicion))
    expect(redondeado(controles.instancia.target.toArray())).toEqual(redondeado(dentro.objetivo))
    expect(controles.props['enableZoom']).toBe(false)
    expect(controles.props['enablePan']).toBe(false)
    expect(controles.props['minDistance']).toBe(1)
    expect(controles.props['maxDistance']).toBe(1)
  })

  it('desde dentro no se oculta ninguna pared aunque ocultar esté activo; al volver fuera, sí', async () => {
    const doc = documento()
    const r = await ReactThreeTestRenderer.create(escena(doc, true, 0, true))
    expect(contarMallas(r)).toBe(esperadas(doc, []))
    await r.update(escena(doc, true, 0, false))
    expect(contarMallas(r)).toBe(esperadas(doc, [2, 3]))
  })

  it('al volver fuera la cámara va a camaraInicial, y «Encuadrar» desde dentro vuelve a la puerta', async () => {
    const doc = documento()
    const r = await ReactThreeTestRenderer.create(escena(doc, true, 0, true))
    sonda.camara.position.set(1, 1.6, 1)
    await r.update(escena(doc, true, 1, true))
    expect(redondeado(sonda.camara.position.toArray())).toEqual(redondeado(camaraDesdeDentro(doc).posicion))
    await r.update(escena(doc, true, 1, false))
    expect(redondeado(sonda.camara.position.toArray())).toEqual(redondeado(camaraInicial(doc).posicion))
    expect(redondeado(controles.instancia.target.toArray())).toEqual(redondeado(camaraInicial(doc).objetivo))
    expect(controles.props['enableZoom']).not.toBe(false)
  })
})

const luz = (r: Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>) =>
  r.scene.findAll((n) => n.type === 'DirectionalLight')[0]!.instance as DirectionalLight

const redondear = (v: Vector3) => v.toArray().map((x) => Number(x.toFixed(9)))

describe('Escena3D: la estancia cambia con el 3D abierto', () => {
  it('la cámara de sombras recalcula su proyección con el nuevo tamaño', async () => {
    const r = await ReactThreeTestRenderer.create(escena(documento(), true))
    const sombra = () => luz(r).shadow.camera
    // En la ortográfica, elements[0] = 2 / (right − left).
    expect(sombra().projectionMatrix.elements[0]).toBeCloseTo(2 / (sombra().right - sombra().left))
    luz(r).shadow.needsUpdate = false
    await r.update(escena(documentoNuevo('salon', 900, 700, 250), true))
    expect(sombra().right).toBeGreaterThan(5)
    expect(sombra().projectionMatrix.elements[0]).toBeCloseTo(2 / (sombra().right - sombra().left))
    expect(luz(r).shadow.needsUpdate).toBe(true)
  })

  it('si cambia la caja de la planta, el objetivo va al nuevo centro y la cámara conserva su posición relativa', async () => {
    const r = await ReactThreeTestRenderer.create(escena(documento(), true))
    sonda.camara.position.set(1, 3, 6)
    const relativa = sonda.camara.position.clone().sub(controles.instancia.target)
    const grande = documentoNuevo('salon', 900, 700, 250)
    await r.update(escena(grande, true))
    expect(controles.instancia.target.toArray()).toEqual(camaraInicial(grande).objetivo)
    expect(redondear(sonda.camara.position.clone().sub(controles.instancia.target))).toEqual(redondear(relativa))
  })

  it('editar un mueble (misma planta, referencias nuevas) no mueve ni el objetivo ni la cámara', async () => {
    const doc = documento()
    const r = await ReactThreeTestRenderer.create(escena(doc, true))
    sonda.camara.position.set(1, 3, 6)
    const objetivo = controles.instancia.target.toArray()
    const copia = structuredClone(doc)
    copia.elementos = []
    await r.update(escena(copia, true))
    expect(controles.instancia.target.toArray()).toEqual(objetivo)
    expect(sonda.camara.position.toArray()).toEqual([1, 3, 6])
  })
})

describe('Escena3D: entorno', () => {
  it('el Environment se vuelve a pintar si las ventanas cambian la dirección del sol, y no si no la cambian', async () => {
    const doc = documento()
    entorno.montajes = 0
    const r = await ReactThreeTestRenderer.create(escena(doc, true))
    expect(entorno.montajes).toBe(1)
    await r.update(escena(structuredClone(doc), true))
    expect(entorno.montajes).toBe(1)
    // Una ventana más ancha en la pared 1 pasa a mandar sobre la dirección del sol.
    const otra = structuredClone(doc)
    otra.aberturas.push({ id: 'v2', tipo: 'ventana', pared: 1, posicion: 50, ancho: 200, alto: 120, alturaSuelo: 90, abreHaciaDentro: false })
    await r.update(escena(otra, true))
    expect(entorno.montajes).toBe(2)
  })
})
