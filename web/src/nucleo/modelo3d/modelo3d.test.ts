import { describe, expect, it } from 'vitest'
import { documentoNuevo } from '../modelo/crear'
import { catalogoBase } from '../catalogo/catalogoBase'
import { elementoNuevo } from '../catalogo/elemento'
import type { DefinicionTipo } from '../catalogo/tipos'
import { rectangulo } from '../geometria/formas'
import { aEscena, modeloPorVolumenes, piezasDeElemento } from './escena'
import { contienePunto } from '../geometria/poligono'
import { camaraAPlano, camaraDesdeDentro, camaraInicial, direccionSol, paredesQueTapan } from './camara'
import type { Vec3 } from './tipos'
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

  it('una caja con radio lo lleva a la escena en metros; sin radio, no aparece la clave', () => {
    const e = elementoNuevo(mesa, { x: 0, y: 0 })
    const [conRadio] = piezasDeElemento(e, conPiezas([{ forma: 'caja', x0: -10, y0: -10, z0: 0, x1: 10, y1: 10, z1: 50, zona: 'tablero', radio: 3 }]))
    if (conRadio.forma !== 'caja') throw new Error('forma')
    expect(conRadio.radio).toBeCloseTo(0.03)
    const [sinRadio] = piezasDeElemento(e, conPiezas([caja(-10, 10)]))
    expect('radio' in sinRadio).toBe(false)
  })

  it('una revolución va en metros en el sistema del elemento, con su origen (posición y altura) y su giro; 24 lados y sin estirar por defecto', () => {
    const e = { ...elementoNuevo(mesa, { x: 100, y: 50 }), rotacion: 90, alturaSuelo: 20 }
    const [p] = piezasDeElemento(e, conPiezas([{ forma: 'revolucion', cx: 5, cy: -10, perfil: [[0, 0], [20, 0], [0, 30]], zona: 'tablero' }]))
    expect(p).toEqual({
      forma: 'revolucion', material: 'madera', color: '#a98462', origen: [1, 0.2, 0.5], giroY: expect.closeTo(-Math.PI / 2, 9),
      centro: [0.05, -0.1], perfil: [[0, 0], [0.2, 0], [0, 0.3]], lados: 24, escalaY: 1,
    })
    const [con] = piezasDeElemento(e, conPiezas([{ forma: 'revolucion', cx: 0, cy: 0, perfil: [[0, 0], [20, 0], [0, 30]], lados: 4, escalaY: 0.5, zona: 'tablero' }]))
    expect(con).toMatchObject({ lados: 4, escalaY: 0.5 })
  })

  it('una extrusión va en metros con su plano; sin huecos, la lista vacía', () => {
    const e = elementoNuevo(mesa, { x: 0, y: 0 })
    const [p] = piezasDeElemento(e, conPiezas([{ forma: 'extrusion', plano: 'alzado', contorno: [[-10, 0], [10, 0], [0, 40]], desde: -2, hasta: 2, zona: 'patas' }]))
    expect(p).toEqual({
      forma: 'extrusion', material: 'metal', color: expect.any(String), origen: [0, 0, 0], giroY: expect.closeTo(0, 9),
      plano: 'alzado', contorno: [[-0.1, 0], [0.1, 0], [0, 0.4]], huecos: [], desde: -0.02, hasta: 0.02, radio: 0,
    })
    const [h] = piezasDeElemento(e, conPiezas([{ forma: 'extrusion', plano: 'planta', contorno: [[0, 0], [10, 0], [10, 10]], huecos: [[[1, 1], [2, 1], [2, 2]]], desde: 0, hasta: 3, zona: 'patas' }]))
    expect(h).toMatchObject({ huecos: [[[0.01, 0.01], [0.02, 0.01], [0.02, 0.02]]] })
  })

  it('una extrusión con cantos redondeados lleva su radio en metros', () => {
    const [p] = piezasDeElemento(elementoNuevo(mesa, { x: 0, y: 0 }), conPiezas([{ forma: 'extrusion', plano: 'planta', contorno: [[0, 0], [10, 0], [10, 10]], desde: 0, hasta: 3, radio: 1, zona: 'patas' }]))
    expect(p).toMatchObject({ forma: 'extrusion', radio: 0.01 })
  })

  it('un tubo va en metros; sin codo ni cierre, recto y abierto', () => {
    const e = { ...elementoNuevo(mesa, { x: 0, y: 0 }), alturaSuelo: 100 }
    const [p] = piezasDeElemento(e, conPiezas([{ forma: 'tubo', puntos: [[0, 0, 0], [10, 0, 40]], r: 2, zona: 'patas' }]))
    expect(p).toMatchObject({ forma: 'tubo', origen: [0, 1, 0], puntos: [[0, 0, 0], [0.1, 0, 0.4]], radio: 0.02, codo: 0, cerrado: false })
    const [c] = piezasDeElemento(e, conPiezas([{ forma: 'tubo', puntos: [[0, 0, 0], [10, 0, 0], [10, 10, 0]], r: 1, codo: 3, cerrado: true, zona: 'patas' }]))
    expect(c).toMatchObject({ codo: 0.03, cerrado: true })
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
  it('valores del vidrio (oscuro, opaco), del cristal de ventana y del metal', () => {
    expect(PBR.vidrio).toEqual({ rugosidad: 0.05, metalicidad: 0, opacidad: 0.95 })
    expect(PBR.cristal).toEqual({ rugosidad: 0.05, metalicidad: 0, opacidad: 0.25 })
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

describe('camaraDesdeDentro', () => {
  const salon = () => documentoNuevo('salon', 400, 330, 250)
  const puerta = (pared: number, posicion: number) => ({ id: 'p', tipo: 'puerta' as const, pared, posicion, ancho: 82, alto: 203, hoja: 'abatible' as const, bisagra: 'izquierda' as const, abreHacia: 'dentro' as const })

  /** Cabeceo de la mirada en grados (negativo, hacia abajo) y rumbo horizontal. */
  const mirada = (c: { posicion: Vec3; objetivo: Vec3 }) => {
    const d = c.objetivo.map((v, k) => v - c.posicion[k]!) as Vec3
    const horizontal = Math.hypot(d[0], d[2])
    return { cabeceo: (Math.atan2(d[1], horizontal) * 180) / Math.PI, distancia: Math.hypot(...d), rumbo: [d[0] / horizontal, d[2] / horizontal] }
  }

  it('a 1,6 m de altura, 0,6 m dentro desde el centro de la primera puerta, mirando hacia el centro con 10° hacia abajo', () => {
    const doc = salon()
    doc.aberturas = [puerta(0, 159)]
    const c = camaraDesdeDentro(doc)
    expect(c.posicion.map((v) => Number(v.toFixed(3)))).toEqual([2, 1.6, 0.6])
    // El objetivo está a un centímetro (girar alrededor de él es girar la cabeza, no andar), rumbo al centro (2, 1,65).
    const m = mirada(c)
    expect(m.distancia).toBeCloseTo(0.01)
    expect(m.cabeceo).toBeCloseTo(-10)
    expect(m.rumbo[0]).toBeCloseTo(0)
    expect(m.rumbo[1]).toBeCloseTo(1)
  })

  it('el cabeceo no depende del tamaño de la estancia: en una de 100 × 100 también son 10°', () => {
    const doc = documentoNuevo('bano', 100, 100, 250)
    const c = camaraDesdeDentro(doc)
    expect(mirada(c).cabeceo).toBeCloseTo(-10)
    expect(c.posicion[1]).toBe(1.6)
  })

  it('la cámara queda siempre dentro de la planta: con un ángulo agudo junto a la puerta se entra menos', () => {
    const doc = salon()
    doc.estancia.planta = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 0, y: 300 }]
    doc.aberturas = [puerta(0, 310)]
    const c = camaraDesdeDentro(doc)
    expect(contienePunto(doc.estancia.planta, { x: c.posicion[0] * 100, y: c.posicion[2] * 100 })).toBe(true)
    expect(c.posicion[2]).toBeGreaterThan(0)
  })

  it('con la puerta en la pared de abajo (de derecha a izquierda) queda 0,6 m por dentro de esa pared', () => {
    const doc = salon()
    doc.aberturas = [puerta(2, 20)]
    const c = camaraDesdeDentro(doc)
    // Pared 2: de (400, 330) a (0, 330); posición 20 + 41 → x = 400 − 61 = 339 cm.
    expect(c.posicion.map((v) => Number(v.toFixed(3)))).toEqual([3.39, 1.6, 2.7])
    expect(c.objetivo[2]).toBeLessThan(2.7)
  })

  it('sin puerta, desde el centro de la pared 0; y una ventana no cuenta como puerta', () => {
    const doc = salon()
    expect(camaraDesdeDentro(doc).posicion.map((v) => Number(v.toFixed(3)))).toEqual([2, 1.6, 0.6])
    doc.aberturas = [{ id: 'v', tipo: 'ventana', pared: 1, posicion: 50, ancho: 100, alto: 120, alturaSuelo: 90, abreHaciaDentro: false }]
    expect(camaraDesdeDentro(doc).posicion.map((v) => Number(v.toFixed(3)))).toEqual([2, 1.6, 0.6])
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

describe('camaraAPlano', () => {
  it('pasa metros de la escena (x, z) a cm del plano', () => {
    expect(camaraAPlano([2, 3, 10])).toEqual({ x: 200, y: 1000 })
  })
})

describe('piezasDeElemento: material elegido por zona (plan 28c)', () => {
  it('usa el material del elemento para la zona si el tipo lo admite; si no lo admite, el de la zona; una pieza con material propio manda', () => {
    const e = elementoNuevo(mesa, { x: 0, y: 0 })
    const def = conPiezas([{ forma: 'cilindro', cx: 0, cy: 0, r: 2, z0: 0, z1: 70, zona: 'patas' }, { ...caja(-10, 10), material: 'vidrio' }])
    expect(piezasDeElemento({ ...e, materiales: { patas: 'madera' } }, def)[0].material).toBe('madera')
    expect(piezasDeElemento({ ...e, materiales: { patas: 'tela' } }, def)[0].material).toBe('metal')
    expect(piezasDeElemento({ ...e, materiales: { tablero: 'lacado' } }, def)[1].material).toBe('vidrio')
    expect(piezasDeElemento(e, def)[0].material).toBe('metal')
  })
})
