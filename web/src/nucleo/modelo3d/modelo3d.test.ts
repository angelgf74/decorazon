import { describe, expect, it } from 'vitest'
import { documentoNuevo } from '../modelo/crear'
import { catalogoBase } from '../catalogo/catalogoBase'
import { elementoNuevo } from '../catalogo/elemento'
import type { DefinicionTipo } from '../catalogo/tipos'
import { rectangulo } from '../geometria/formas'
import { aEscena, modeloPorVolumenes, piezasDeElemento } from './escena'
import { camaraInicial, direccionSol, paredesQueTapan } from './camara'
import { PBR } from './materiales'
import type { PiezaLocal } from './tipos'

const mesa = catalogoBase.get('mesa') as DefinicionTipo
const conPiezas = (piezas: PiezaLocal[]): DefinicionTipo => ({ ...mesa, modelo3d: () => piezas })
const caja = (x0: number, x1: number): PiezaLocal => ({ forma: 'caja', x0, y0: -10, z0: 0, x1, y1: 10, z1: 50, zona: 'tablero' })

describe('aEscena', () => {
  it('pasa cm del plano a metros de la escena', () => {
    expect(aEscena({ x: 200, y: 330 }, 85)).toEqual([2, 0.85, 3.3])
  })
})

describe('piezasDeElemento', () => {
  it('caja centrada con giro 90', () => {
    const e = { ...elementoNuevo(mesa, { x: 100, y: 50 }), rotacion: 90 }
    const [p] = piezasDeElemento(e, conPiezas([caja(-10, 10)]))
    if (p.forma !== 'caja') throw new Error('forma')
    expect(p.centro[0]).toBeCloseTo(1)
    expect(p.centro[2]).toBeCloseTo(0.5)
    expect(p.giroY).toBeCloseTo(-Math.PI / 2)
  })

  it('desplazada +10 en x local con giro 90 queda en z = 0.6', () => {
    const e = { ...elementoNuevo(mesa, { x: 100, y: 50 }), rotacion: 90 }
    const [p] = piezasDeElemento(e, conPiezas([caja(0, 20)]))
    if (p.forma !== 'caja') throw new Error('forma')
    expect(p.centro[0]).toBeCloseTo(1)
    expect(p.centro[2]).toBeCloseTo(0.6)
    expect(p.tamano).toEqual([0.2, 0.5, 0.2])
  })

  it('cilindro y altura sobre el suelo', () => {
    const e = { ...elementoNuevo(mesa, { x: 0, y: 0 }), alturaSuelo: 100 }
    const [p] = piezasDeElemento(e, conPiezas([{ forma: 'cilindro', cx: 10, cy: 0, r: 5, z0: 0, z1: 40, zona: 'patas' }]))
    expect(p).toMatchObject({ forma: 'cilindro', radio: 0.05, alto: 0.4, material: 'metal' })
    expect(p.forma === 'cilindro' && p.centro).toEqual([0.1, 1.2, 0])
  })

  it('color del elemento o, si falta, el defecto de la zona', () => {
    const e = elementoNuevo(mesa, { x: 0, y: 0 })
    const def = conPiezas([caja(-10, 10)])
    expect(piezasDeElemento({ ...e, colores: { tablero: '#123456' } }, def)[0].color).toBe('#123456')
    expect(piezasDeElemento({ ...e, colores: {} }, def)[0].color).toBe('#a98462')
    expect(piezasDeElemento(e, def)[0].material).toBe('madera')
  })

  it('modeloPorVolumenes: una caja del tamaño del elemento', () => {
    const e = elementoNuevo(mesa, { x: 0, y: 0 })
    const m = modeloPorVolumenes(e)
    expect(m).toHaveLength(1)
    expect(m[0]).toMatchObject({ forma: 'caja', x1: 70, x0: -70, y1: 40, y0: -40, z0: 0, z1: 75 })
    const [p] = piezasDeElemento(e, { ...mesa, modelo3d: undefined })
    expect(p.forma === 'caja' && p.tamano).toEqual([1.4, 0.75, 0.8])
  })
})

describe('PBR', () => {
  it('valores del vidrio y del metal', () => {
    expect(PBR.vidrio).toEqual({ rugosidad: 0.05, metalicidad: 0, opacidad: 0.25 })
    expect(PBR.metal.metalicidad).toBe(0.85)
  })
})

describe('camaraInicial', () => {
  it('mira desde delante a la izquierda con 45 grados', () => {
    const c = camaraInicial(documentoNuevo('dormitorio', 400, 330, 250))
    expect(c.objetivo).toEqual([2, 1, 1.65])
    expect(c.posicion[0]).toBeLessThan(2)
    expect(c.posicion[2]).toBeGreaterThan(1.65)
    const h = Math.hypot(c.posicion[0] - 2, c.posicion[2] - 1.65)
    const elev = (Math.atan2(c.posicion[1] - 1, h) * 180) / Math.PI
    expect(elev).toBeCloseTo(45, 0)
    const diag = Math.hypot(4, 3.3)
    expect(c.distanciaMin).toBe(1)
    expect(c.distanciaMax).toBeCloseTo(3 * diag)
    expect(Math.hypot(c.posicion[0] - 2, c.posicion[1] - 1, c.posicion[2] - 1.65)).toBeCloseTo(1.6 * diag)
  })
})

describe('direccionSol', () => {
  it('con ventana en la pared de arriba entra por -z', () => {
    const doc = documentoNuevo('dormitorio', 400, 330, 250)
    doc.aberturas.push({ id: 'v', tipo: 'ventana', pared: 0, posicion: 100, ancho: 120, alto: 120, alturaSuelo: 90, abreHaciaDentro: true })
    const s = direccionSol(doc)
    expect(s[2]).toBeLessThan(0)
    expect(s[1]).toBeCloseTo(Math.SQRT1_2)
    expect(Math.hypot(...s)).toBeCloseTo(1)
  })

  it('usa la ventana más ancha', () => {
    const doc = documentoNuevo('dormitorio', 400, 330, 250)
    doc.aberturas.push({ id: 'a', tipo: 'ventana', pared: 0, posicion: 10, ancho: 50, alto: 100, alturaSuelo: 90, abreHaciaDentro: true })
    doc.aberturas.push({ id: 'b', tipo: 'ventana', pared: 1, posicion: 10, ancho: 90, alto: 100, alturaSuelo: 90, abreHaciaDentro: true })
    expect(direccionSol(doc)[0]).toBeGreaterThan(0)
  })

  it('sin ventanas, el vector por defecto', () => {
    const s = direccionSol(documentoNuevo('dormitorio', 400, 330, 250))
    const l = Math.hypot(-1, 1.5, -0.7)
    expect(s[0]).toBeCloseTo(-1 / l)
    expect(s[1]).toBeCloseTo(1.5 / l)
    expect(s[2]).toBeCloseTo(-0.7 / l)
  })
})

describe('paredesQueTapan', () => {
  const planta = rectangulo({ x: 200, y: 165 }, 400, 330, 0)
  it('desde abajo tapa la pared de abajo', () => {
    expect(paredesQueTapan(planta, { x: 200, y: 1000 })).toEqual([2])
  })
  it('desde abajo a la izquierda tapan abajo e izquierda', () => {
    expect(paredesQueTapan(planta, { x: -500, y: 1000 })).toEqual([2, 3])
  })
})

describe('piezasDeElemento: material y color propios de la pieza', () => {
  it('anulan los de la zona y los del elemento', () => {
    const e = { ...elementoNuevo(mesa, { x: 0, y: 0 }), colores: { tablero: '#123456' } }
    const [p, q] = piezasDeElemento(e, conPiezas([{ ...caja(-10, 10), material: 'vidrio', color: '#1f1f1f' }, caja(-10, 10)]))
    expect(p).toMatchObject({ material: 'vidrio', color: '#1f1f1f' })
    expect(q).toMatchObject({ material: 'madera', color: '#123456' })
  })
})
