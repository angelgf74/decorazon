import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { Color, Mesh, MeshStandardMaterial } from 'three'
import { beforeEach, describe, expect, it } from 'vitest'
import { catalogoBase, piezasDeElemento, type Elemento } from '../../nucleo'
import { elemento } from '../../nucleo/catalogo/definiciones/ayuda.test-util'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import Mueble3D from './Mueble3D'

function montar(...elementos: Elemento[]) {
  almacen.getState().cambiar((d) => ({ ...d, elementos }))
}

const armario = () => elemento('armario', 100, 30, 0, {}, {}, 'a1')
const cama = () => elemento('cama', 213, 100, 0, {}, {}, 'c1')
const emisivos = (mallas: { instance: unknown }[]) =>
  mallas.map((m) => ((m.instance as Mesh).material as MeshStandardMaterial).emissive.getHexString())

beforeEach(() => {
  reiniciarAlmacen()
  almacen.getState().crear('dormitorio', 400, 330, 250)
})

describe('Mueble3D', () => {
  it('una malla por pieza del mueble', async () => {
    const a = armario()
    montar(a)
    const r = await ReactThreeTestRenderer.create(<Mueble3D elemento={a} />)
    const mallas = r.scene.findAll((n) => n.type === 'Mesh')
    expect(mallas).toHaveLength(piezasDeElemento(a, catalogoBase.get('armario')!).length)
    expect(mallas.length).toBeGreaterThan(1)
  })

  it('sin conflicto ni selección no se resalta', async () => {
    const a = armario()
    montar(a)
    const r = await ReactThreeTestRenderer.create(<Mueble3D elemento={a} />)
    expect(new Set(emisivos(r.scene.findAll((n) => n.type === 'Mesh')))).toEqual(new Set(['000000']))
  })

  it('con un solape con la cama, todas sus piezas emiten en rojo, y seleccionado sigue en rojo', async () => {
    const a = armario()
    montar(a, cama())
    const r = await ReactThreeTestRenderer.create(<Mueble3D elemento={a} />)
    const mallas = r.scene.findAll((n) => n.type === 'Mesh')
    expect(new Set(emisivos(mallas))).toEqual(new Set(['d62828']))
    await ReactThreeTestRenderer.act(async () => {
      almacen.getState().seleccionar({ tipo: 'elemento', id: 'a1' })
    })
    expect(new Set(emisivos(r.scene.findAll((n) => n.type === 'Mesh')))).toEqual(new Set(['d62828']))
  })

  it('seleccionado y sin conflicto, en terracota', async () => {
    const a = armario()
    montar(a)
    almacen.getState().seleccionar({ tipo: 'elemento', id: 'a1' })
    const r = await ReactThreeTestRenderer.create(<Mueble3D elemento={a} />)
    expect(new Set(emisivos(r.scene.findAll((n) => n.type === 'Mesh')))).toEqual(new Set(['b9473a']))
  })

  it('seleccionado y en conflicto: sigue en rojo y cada pieza lleva contorno terracota; sin seleccionar, sin contorno', async () => {
    const a = armario()
    montar(a, cama())
    const r = await ReactThreeTestRenderer.create(<Mueble3D elemento={a} />)
    const contornos = () => r.scene.findAll((n) => n.type === 'LineSegments2')
    expect(contornos()).toHaveLength(0)
    await ReactThreeTestRenderer.act(async () => {
      almacen.getState().seleccionar({ tipo: 'elemento', id: 'a1' })
    })
    const mallas = r.scene.findAll((n) => n.type === 'Mesh')
    expect(new Set(emisivos(mallas))).toEqual(new Set(['d62828']))
    expect(contornos()).toHaveLength(mallas.length)
    for (const m of mallas) {
      const hijos = m.children.filter((h) => h.type === 'LineSegments2')
      expect(hijos).toHaveLength(1)
      expect((hijos[0]!.instance as unknown as { material: { color: Color } }).material.color.getHexString()).toBe('b9473a')
    }
  })

  it('seleccionado sin conflicto también lleva el contorno', async () => {
    const a = armario()
    montar(a)
    almacen.getState().seleccionar({ tipo: 'elemento', id: 'a1' })
    const r = await ReactThreeTestRenderer.create(<Mueble3D elemento={a} />)
    expect(r.scene.findAll((n) => n.type === 'LineSegments2')).toHaveLength(r.scene.findAll((n) => n.type === 'Mesh').length)
  })

  it('un clic en el paso 1 pasa al paso 2 y selecciona el mueble', async () => {
    const a = armario()
    montar(a)
    expect(almacen.getState().paso).toBe(1)
    const r = await ReactThreeTestRenderer.create(<Mueble3D elemento={a} />)
    const malla = r.scene.findAll((n) => n.type === 'Mesh')[0]!
    await r.fireEvent(malla, 'click')
    expect(almacen.getState().paso).toBe(2)
    expect(almacen.getState().seleccion).toEqual({ tipo: 'elemento', id: 'a1' })
  })

  it('un clic al final de un arrastre (orbitar) no selecciona ni cambia de paso', async () => {
    const a = armario()
    montar(a)
    const r = await ReactThreeTestRenderer.create(<Mueble3D elemento={a} />)
    const malla = r.scene.findAll((n) => n.type === 'Mesh')[0]!
    await r.fireEvent(malla, 'click', { delta: 40 })
    expect(almacen.getState().paso).toBe(1)
    expect(almacen.getState().seleccion).toBeNull()
  })
})
