import ReactThreeTestRenderer from '@react-three/test-renderer'
import { Box3, Vector3, type Mesh } from 'three'
import { describe, expect, it, vi } from 'vitest'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import { documentoNuevo, escenaEstancia } from '../../nucleo'
import { elemento } from '../../nucleo/catalogo/definiciones/ayuda.test-util'
import Estancia3D from './Estancia3D'
import { geometriaPrisma, geometriaSuelo } from './geometrias'
import { materialDe } from './materiales3d'

describe('Estancia3D', () => {
  it('una malla por suelo, trozo de muro, pieza de hueco y estructura', async () => {
    const doc = documentoNuevo('salon', 400, 330, 250)
    doc.aberturas.push({ id: 'p1', tipo: 'puerta', pared: 0, posicion: 159, ancho: 82, alto: 203, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' })
    const { muros, huecos, estructura } = escenaEstancia(doc)
    expect(huecos.length).toBeGreaterThan(0)
    expect(muros.length).toBeGreaterThan(4)
    const r = await ReactThreeTestRenderer.create(<Estancia3D doc={doc} ocultas={new Set()} />)
    const mallas = r.scene.findAll((n) => n.type === 'Mesh')
    expect(mallas).toHaveLength(muros.length + huecos.length + estructura.length + 1)
    for (const m of mallas) {
      expect(m.props.castShadow || m.props.receiveShadow).toBe(true)
    }
  })

  it('muros, marcos, hojas y cristal reciben sombra pero no la proyectan; la estructura sí', async () => {
    // La sombra de un muro con el sol a 45° cubría media estancia (y una frontera recta en el suelo) y tapaba la de los muebles;
    // además cambiaba al ocultar la pared al orbitar.
    const doc = documentoNuevo('salon', 400, 330, 250)
    doc.aberturas.push(
      { id: 'v1', tipo: 'ventana', pared: 1, posicion: 50, ancho: 100, alto: 120, alturaSuelo: 90, abreHaciaDentro: false },
      { id: 'p1', tipo: 'puerta', pared: 0, posicion: 159, ancho: 82, alto: 203, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' },
    )
    doc.estructura.push({ id: 'c1', tipo: 'columna', centro: { x: 100, y: 100 }, ancho: 30, fondo: 20, rotacion: 0 })
    const r = await ReactThreeTestRenderer.create(<Estancia3D doc={doc} ocultas={new Set()} />)
    const mallas = r.scene.findAll((n) => n.type === 'Mesh')
    const cristal = mallas.filter((m) => (m.instance as Mesh).material === materialDe('cristal', '#cfe3ea'))
    expect(cristal).toHaveLength(1)
    const columna = mallas.filter((m) => m.instance.position.distanceTo(new Vector3(1, 1.25, 1)) < 1e-9)
    expect(columna).toHaveLength(1)
    expect(mallas.every((m) => m.instance.receiveShadow)).toBe(true)
    expect(mallas.filter((m) => m.instance.castShadow)).toEqual(columna)
  })

  it('estructura: columna girada y radiador en su sitio', async () => {
    const doc = documentoNuevo('salon', 400, 330, 250)
    doc.estructura.push(
      { id: 'c1', tipo: 'columna', centro: { x: 100, y: 100 }, ancho: 30, fondo: 20, rotacion: 90 },
      { id: 'r1', tipo: 'radiador', pared: 0, posicion: 100, ancho: 80, alto: 60, fondo: 10, alturaSuelo: 15 },
    )
    const { muros, estructura } = escenaEstancia(doc)
    const r = await ReactThreeTestRenderer.create(<Estancia3D doc={doc} ocultas={new Set()} />)
    const mallas = r.scene.findAll((n) => n.type === 'Mesh')
    expect(mallas).toHaveLength(muros.length + estructura.length + 1)
    const columna = mallas.find((m) => m.instance.position.distanceTo(new Vector3(1, 1.25, 1)) < 1e-9)!
    expect(columna.instance.rotation.y).toBeCloseTo(-Math.PI / 2)
    const caja = new Box3().setFromObject(columna.instance)
    expect(caja.max.x - caja.min.x).toBeCloseTo(0.2)
    expect(caja.max.z - caja.min.z).toBeCloseTo(0.3)
    const radiador = mallas.find((m) => (m.instance as Mesh).material === materialDe('metal', '#f2f2f2'))!
    expect(radiador.instance.position.toArray().map((v) => Number(v.toFixed(6)))).toEqual([1.4, 0.45, 0.05])
  })
})

describe('Estancia3D: paredes ocultas', () => {
  it('con la pared 2 oculta no se pintan sus muros ni sus huecos y el resto sigue', async () => {
    const doc = documentoNuevo('salon', 400, 330, 250)
    doc.aberturas.push(
      { id: 'p1', tipo: 'puerta', pared: 0, posicion: 159, ancho: 82, alto: 203, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' },
      { id: 'v1', tipo: 'ventana', pared: 2, posicion: 50, ancho: 100, alto: 120, alturaSuelo: 90, abreHaciaDentro: false },
    )
    const { muros, huecos, estructura } = escenaEstancia(doc)
    const deLaDos = muros.filter((m) => m.pared === 2).length + huecos.filter((h) => h.pared === 2).length
    expect(huecos.some((h) => h.pared === 2)).toBe(true)
    const r = await ReactThreeTestRenderer.create(<Estancia3D doc={doc} ocultas={new Set([2])} />)
    const mallas = r.scene.findAll((n) => n.type === 'Mesh')
    expect(mallas).toHaveLength(muros.length + huecos.length + estructura.length + 1 - deLaDos)
    // El cristal de la ventana (pared 2) ya no está; la puerta (pared 0) sigue.
    expect(mallas.some((m) => (m.instance as Mesh).material === materialDe('cristal', '#cfe3ea'))).toBe(false)
    expect(mallas.some((m) => (m.instance as Mesh).material === materialDe('madera', '#d9c7a8'))).toBe(true)
  })

  it('el radiador se oculta con su pared; la columna, que no está pegada a ninguna, sigue', async () => {
    const doc = documentoNuevo('salon', 400, 330, 250)
    doc.estructura.push(
      { id: 'c1', tipo: 'columna', centro: { x: 100, y: 100 }, ancho: 30, fondo: 20, rotacion: 0 },
      { id: 'r1', tipo: 'radiador', pared: 2, posicion: 100, ancho: 80, alto: 60, fondo: 10, alturaSuelo: 15 },
    )
    const radiador = (m: { instance: unknown }) => (m.instance as Mesh).material === materialDe('metal', '#f2f2f2')
    const visible = await ReactThreeTestRenderer.create(<Estancia3D doc={doc} ocultas={new Set([0])} />)
    expect(visible.scene.findAll((n) => n.type === 'Mesh').filter(radiador)).toHaveLength(1)
    const oculta = await ReactThreeTestRenderer.create(<Estancia3D doc={doc} ocultas={new Set([2])} />)
    const mallas = oculta.scene.findAll((n) => n.type === 'Mesh')
    expect(mallas.filter(radiador)).toHaveLength(0)
    expect(mallas.some((m) => m.instance.position.distanceTo(new Vector3(1, 1.25, 1)) < 1e-9)).toBe(true)
  })
})

describe('geometrías', () => {
  it('el prisma cae en x/z de su huella y de y0 a y1', () => {
    const g = geometriaPrisma([[1, 2], [3, 2], [3, 2.5], [1, 2.5]], 0.5, 2.1)
    g.computeBoundingBox()
    const b = g.boundingBox as Box3
    expect(b.min.x).toBeCloseTo(1)
    expect(b.max.x).toBeCloseTo(3)
    expect(b.min.y).toBeCloseTo(0.5)
    expect(b.max.y).toBeCloseTo(2.1)
    expect(b.min.z).toBeCloseTo(2)
    expect(b.max.z).toBeCloseTo(2.5)
  })

  it('el suelo es la planta en metros a y = 0 y mira hacia arriba', () => {
    const g = geometriaSuelo([{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 330 }, { x: 0, y: 330 }])
    g.computeBoundingBox()
    const b = g.boundingBox as Box3
    expect([b.min.x, b.max.x, b.min.z, b.max.z]).toEqual([0, 4, 0, 3.3].map((v) => expect.closeTo(v)))
    expect(b.min.y).toBeCloseTo(0)
    expect(b.max.y).toBeCloseTo(0)
    expect(g.getAttribute('normal').getY(0)).toBeCloseTo(1)
  })
})

describe('Estancia3D: muros y huecos tapan los clics', () => {
  it('muros, marcos, hojas y estructura detienen el clic y el paso del ratón sin tocar la selección; el suelo no', async () => {
    reiniciarAlmacen()
    almacen.getState().crear('salon', 400, 330, 250)
    const doc = documentoNuevo('salon', 400, 330, 250)
    doc.aberturas.push(
      { id: 'p1', tipo: 'puerta', pared: 0, posicion: 159, ancho: 82, alto: 203, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' },
      { id: 'v1', tipo: 'ventana', pared: 1, posicion: 50, ancho: 100, alto: 120, alturaSuelo: 90, abreHaciaDentro: false },
    )
    doc.estructura.push({ id: 'c1', tipo: 'columna', centro: { x: 100, y: 100 }, ancho: 30, fondo: 20, rotacion: 0 })
    almacen.getState().seleccionar({ tipo: 'pared', indice: 2 })
    const r = await ReactThreeTestRenderer.create(<Estancia3D doc={doc} ocultas={new Set()} />)
    const mallas = r.scene.findAll((n) => n.type === 'Mesh')
    const suelo = mallas.filter((m) => (m.instance as Mesh).material === materialDe('suelo', doc.estancia.colorSuelo))
    expect(suelo).toHaveLength(1)
    expect(suelo[0]!.props.onClick).toBeUndefined()
    const resto = mallas.filter((m) => m !== suelo[0])
    expect(resto.length).toBeGreaterThan(10)
    for (const m of resto) {
      for (const evento of ['click', 'pointerOver'] as const) {
        const parar = vi.fn()
        await r.fireEvent(m, evento, { stopPropagation: parar })
        expect(parar).toHaveBeenCalledTimes(1)
      }
    }
    expect(almacen.getState().seleccion).toEqual({ tipo: 'pared', indice: 2 })
  })
})

describe('Estancia3D: memoria', () => {
  it('editar un mueble (doc nuevo con la misma estancia) no recrea ni libera las geometrías de los muros', async () => {
    const doc = documentoNuevo('salon', 400, 330, 250)
    doc.aberturas.push({ id: 'p1', tipo: 'puerta', pared: 0, posicion: 159, ancho: 82, alto: 203, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' })
    doc.elementos.push(elemento('armario', 100, 30, 0, {}, {}, 'a1'))
    const r = await ReactThreeTestRenderer.create(<Estancia3D doc={doc} ocultas={new Set()} />)
    const extruidas = () => r.scene.findAll((n) => n.type === 'Mesh')
      .map((m) => (m.instance as Mesh).geometry)
      .filter((g) => g.type === 'ExtrudeGeometry')
    const antes = extruidas()
    expect(antes.length).toBeGreaterThan(4)
    const liberadas = vi.fn()
    for (const g of antes) g.addEventListener('dispose', liberadas)
    // Como `cambiar`, que redondea y recrea todas las referencias del documento.
    const editado = structuredClone(doc)
    editado.elementos[0]!.colores = { cuerpo: '#123456' }
    await r.update(<Estancia3D doc={editado} ocultas={new Set()} />)
    expect(extruidas()).toHaveLength(antes.length)
    extruidas().forEach((g, k) => expect(g).toBe(antes[k]))
    expect(liberadas).not.toHaveBeenCalled()
  })

  it('cambiar la estancia sí recalcula los muros', async () => {
    const doc = documentoNuevo('salon', 400, 330, 250)
    const r = await ReactThreeTestRenderer.create(<Estancia3D doc={doc} ocultas={new Set()} />)
    const geometrias = () => r.scene.findAll((n) => n.type === 'Mesh').map((m) => (m.instance as Mesh).geometry).filter((g) => g.type === 'ExtrudeGeometry')
    const antes = geometrias()
    const alto = structuredClone(doc)
    alto.estancia.alto = 270
    await r.update(<Estancia3D doc={alto} ocultas={new Set()} />)
    expect(geometrias().some((g, k) => g !== antes[k])).toBe(true)
  })
})

describe('Estancia3D: suelo según la estancia (M-12)', () => {
  const sueloDe = async (tipo: 'bano' | 'salon') => {
    const doc = documentoNuevo(tipo, 300, 300, 250)
    const r = await ReactThreeTestRenderer.create(<Estancia3D doc={doc} ocultas={new Set()} />)
    return { doc, material: (r.scene.findAll((n) => n.type === 'Mesh')[0]!.instance as Mesh).material }
  }

  it('el baño lleva baldosa y el salón tarima, con el color del suelo', async () => {
    const bano = await sueloDe('bano')
    expect(bano.material).toBe(materialDe('baldosa', bano.doc.estancia.colorSuelo))
    const salon = await sueloDe('salon')
    expect(salon.material).toBe(materialDe('suelo', salon.doc.estancia.colorSuelo))
  })
})
