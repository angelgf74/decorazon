import { describe, expect, it } from 'vitest'
import { catalogoBase } from '../catalogoBase'
import { documentoNuevo } from '../../modelo/crear'
import { detectarConflictos } from '../../conflictos/detectar'
import type { Elemento } from '../../modelo/documento'
import { elemento } from './ayuda.test-util'

const NUEVOS = ['inodoro', 'bide', 'lavabo', 'ducha', 'banera', 'espejo', 'armario-espejo', 'lavadora', 'columna-bano']
const COMPARTIDOS = ['cuadro', 'planta', 'lampara-pie', 'alfombra', 'cortina', 'papelera', 'estanteria']

const def = (id: string) => {
  const d = catalogoBase.get(id)
  if (!d) throw new Error(id)
  return d
}

/** Baño de ancho×largo: las piezas sin girar tienen la espalda en la pared y = 0 y el frente hacia +y. */
function enBano(ancho: number, largo: number, ...elementos: Elemento[]) {
  const doc = documentoNuevo('bano', ancho, largo, 250)
  doc.elementos = elementos
  return detectarConflictos(doc, catalogoBase)
}

describe('piezas de baño', () => {
  it('los nueve tipos nuevos son del baño; la decoración y la estantería también valen en el baño', () => {
    for (const id of NUEVOS) expect(def(id).estancias).toContain('bano')
    for (const id of COMPARTIDOS) expect(def(id).estancias).toContain('bano')
  })

  it('inodoro con 70 cm libres delante: sin avisos', () => {
    // Fondo 66: frente en y = 66 y espacio de uso hasta 136.
    expect(enBano(250, 200, elemento('inodoro', 100, 33, 0))).toEqual([])
  })

  it('inodoro con la pared de enfrente a 55 cm: el espacio de uso choca con la pared y faltan 15 cm', () => {
    expect(enBano(250, 121, elemento('inodoro', 100, 33, 0, {}, {}, 'i'))).toEqual([
      expect.objectContaining({ tipo: 'apertura', ids: ['i'], mensaje: 'El espacio de uso del inodoro choca con la pared: faltan 15 cm' }),
    ])
  })

  it('inodoro sin cisterna vista: solo la taza, hasta 40 cm', () => {
    const vols = def('inodoro').volumenes(elemento('inodoro', 0, 0, 0, {}, { cisterna: false }))
    expect(Math.max(...vols.map((v) => v.zMax))).toBe(40)
    expect(Math.max(...def('inodoro').volumenes(elemento('inodoro', 0, 0, 0)).map((v) => v.zMax))).toBe(78)
  })

  it('inodoro y lavabo enfrentados a 50 cm: el espacio de uso de cada uno choca con el otro y faltan 20 cm', () => {
    // Lavabo girado 180° contra la pared y = 162: fondo 46, de y 116 a 162.
    const c = enBano(250, 162, elemento('inodoro', 100, 33, 0, {}, {}, 'i'), elemento('lavabo', 100, 139, 180, {}, {}, 'l'))
    expect(c.map((x) => x.mensaje)).toEqual(expect.arrayContaining([
      'El espacio de uso del inodoro choca con el lavabo: faltan 20 cm',
      'El espacio de uso del lavabo choca con el inodoro: faltan 20 cm',
    ]))
  })

  it('inodoro frente a un plato de ducha bajo a 30 cm: faltan 40 cm, no el alto del plato', () => {
    // Ducha sin mampara girada 180°, de y 96 a 176: el espacio de uso (y 66..136) entra 40 cm en ella.
    const c = enBano(250, 176, elemento('inodoro', 100, 33, 0, {}, {}, 'i'), elemento('ducha', 100, 136, 180, {}, { mampara: 'ninguna' }, 'd'))
    expect(c.map((x) => x.mensaje)).toContain('El espacio de uso del inodoro choca con el plato de ducha: faltan 40 cm')
  })

  it('inodoro a 30 cm de la pared lateral: su espacio de uso es de 70 cm de ancho y faltan 5 cm', () => {
    expect(enBano(250, 200, elemento('inodoro', 30, 33, 0, {}, {}, 'i'))).toEqual([
      expect.objectContaining({ ids: ['i'], mensaje: 'El espacio de uso del inodoro choca con la pared: faltan 5 cm' }),
    ])
  })

  it('inodoro y bidé uno al lado del otro con una alfombrilla delante: sin avisos', () => {
    expect(enBano(250, 200,
      elemento('inodoro', 60, 33, 0),
      elemento('bide', 130, 27, 0),
      elemento('alfombra', 95, 100, 0, { ancho: 60, fondo: 40 }),
    )).toEqual([])
  })

  it('espejo y armario de espejo colgados sobre el lavabo: sin avisos', () => {
    expect(enBano(250, 200, elemento('lavabo', 125, 23, 0), elemento('espejo', 125, 1.5, 0))).toEqual([])
    expect(enBano(250, 200, elemento('lavabo', 125, 23, 0), elemento('armario-espejo', 125, 7.5, 0))).toEqual([])
  })

  it('lavabo suspendido: el mueble no llega al suelo; al suelo, sí', () => {
    const zMin = (variantes: Elemento['variantes']) => Math.min(...def('lavabo').volumenes(elemento('lavabo', 0, 0, 0, {}, variantes)).map((v) => v.zMin))
    expect(zMin({})).toBeGreaterThan(0)
    expect(zMin({ montaje: 'al suelo' })).toBe(0)
  })

  it('plato de ducha: sin mampara, solo el plato; con mampara, el cristal hasta 195 cm por encima del plato', () => {
    expect(def('ducha').volumenes(elemento('ducha', 0, 0, 0, {}, { mampara: 'ninguna' }))).toHaveLength(1)
    for (const mampara of ['fija', 'corredera', 'abatible']) {
      const vols = def('ducha').volumenes(elemento('ducha', 0, 0, 0, {}, { mampara }))
      expect(Math.max(...vols.map((v) => v.zMax))).toBe(5 + 195)
    }
  })

  it('mampara abatible: su puerta barre más allá del espacio de entrada y choca con un lavabo que la corredera deja libre', () => {
    // Ducha de 120×80 en la esquina (x 0..120, y 0..80); lavabo girado 180° con el frente en y = 145.
    const piezas = (mampara: string) => [elemento('ducha', 60, 40, 0, {}, { mampara }, 'd'), elemento('lavabo', 40, 168, 180, {}, {}, 'l')]
    const deLaDucha = (mampara: string) => enBano(250, 191, ...piezas(mampara)).filter((c) => c.ids[0] === 'd')
    expect(deLaDucha('corredera')).toEqual([])
    const abatible = deLaDucha('abatible')
    expect(abatible).toHaveLength(1)
    expect(abatible[0]!.mensaje).toMatch(/^La mampara del plato de ducha choca con el lavabo: faltan \d+ cm$/)
  })

  it('bañera con la pared de enfrente a 50 cm: el espacio de entrada choca con la pared y faltan 10 cm', () => {
    // Fondo 75: frente en y = 75 y espacio de entrada hasta 135.
    expect(enBano(250, 125, elemento('banera', 125, 37.5, 0, {}, {}, 'b'))).toEqual([
      expect.objectContaining({ tipo: 'apertura', ids: ['b'], mensaje: 'El espacio de entrada de la bañera choca con la pared: faltan 10 cm' }),
    ])
  })

  it('la puerta de la lavadora choca con una columna de baño a 30 cm', () => {
    // Columna girada 180°, de y 90 a 120.
    const c = enBano(250, 200, elemento('lavadora', 30, 30, 0, {}, {}, 'lav'), elemento('columna-bano', 30, 105, 180, {}, {}, 'col'))
    expect(c.some((x) => x.tipo === 'apertura' && x.ids[0] === 'lav' && x.mensaje.startsWith('La puerta de la lavadora choca con la columna de baño'))).toBe(true)
  })

  it('la columna de baño y el armario de espejo tienen puertas que se abren por delante', () => {
    expect(def('columna-bano').zonasApertura(elemento('columna-bano', 0, 0, 0))).toHaveLength(1)
    expect(def('armario-espejo').zonasApertura(elemento('armario-espejo', 0, 0, 0, { ancho: 60 }))).toHaveLength(1)
    expect(def('armario-espejo').zonasApertura(elemento('armario-espejo', 0, 0, 0, { ancho: 80 }))).toHaveLength(2)
  })
})
