import { describe, expect, it } from 'vitest'
import { catalogoBase } from '../catalogoBase'
import { huellasEnPlanta } from '../elemento'
import { documentoNuevo } from '../../modelo/crear'
import { detectarConflictos } from '../../conflictos/detectar'
import { contienePunto } from '../../geometria/poligono'
import type { Elemento } from '../../modelo/documento'
import { elemento } from './ayuda.test-util'

const def = () => {
  const d = catalogoBase.get('armario-esquinero')
  if (!d) throw new Error('armario-esquinero')
  return d
}

describe('armario esquinero', () => {
  it('es un armario del dormitorio de 110 × 110 × 201, con el rincón a la izquierda y 58 de profundidad por defecto', () => {
    const d = def()
    expect(d).toMatchObject({ nombre: 'armario esquinero', genero: 'm', estancias: ['dormitorio'] })
    expect(d.medidas).toEqual({ ancho: { min: 80, max: 200, defecto: 110 }, fondo: { min: 80, max: 200, defecto: 110 }, alto: { min: 150, max: 260, defecto: 201 } })
    expect(d.variantes.map((v) => [v.clave, v.defecto])).toEqual([['rincon', 'izquierda'], ['profundidad', 58]])
    expect(d.zonasColor.map((z) => z.clave)).toEqual(['cuerpo', 'puertas'])
  })

  it('en el plano, una sola L de seis vértices con el ala en el lado del rincón', () => {
    const izquierda = huellasEnPlanta(def(), elemento('armario-esquinero', 0, 0, 0))
    expect(izquierda).toHaveLength(1)
    expect(izquierda[0]).toHaveLength(6)
    // 110 × 110 con 58 de profundidad: el ala llega hasta y = 55 por el lado del rincón, de x = -55 a x = 3.
    const abajo = (h: { x: number; y: number }[]) => h.filter((p) => Math.abs(p.y - 55) < 1e-9).map((p) => p.x)
    expect(abajo(izquierda[0]!).sort((a, b) => a - b)).toEqual([-55, 3])
    const derecha = huellasEnPlanta(def(), elemento('armario-esquinero', 0, 0, 0, {}, { rincon: 'derecha' }))
    expect(abajo(derecha[0]!).sort((a, b) => a - b)).toEqual([-3, 55])
  })

  it('dos volúmenes que cubren la L: el cuerpo del fondo y el del ala, sin el hueco', () => {
    const vols = def().volumenes(elemento('armario-esquinero', 0, 0, 0))
    expect(vols).toHaveLength(2)
    const dentro = (p: { x: number; y: number }) => vols.some((v) => contienePunto(v.huella, p))
    expect(dentro({ x: 40, y: -40 })).toBe(true) // fondo, extremo derecho
    expect(dentro({ x: -40, y: 40 })).toBe(true) // ala, delante
    expect(dentro({ x: 30, y: 30 })).toBe(false) // el hueco de la L
    for (const v of vols) expect(v).toMatchObject({ zMin: 0, zMax: 201 })
  })

  it('con 35 de profundidad los cuerpos adelgazan', () => {
    const vols = def().volumenes(elemento('armario-esquinero', 0, 0, 0, {}, { profundidad: 35 }))
    const dentro = (p: { x: number; y: number }) => vols.some((v) => contienePunto(v.huella, p))
    expect(dentro({ x: 40, y: -25 })).toBe(true)
    expect(dentro({ x: 40, y: -15 })).toBe(false)
  })

  it('una puerta abatible en cada frente libre, que abre hacia el hueco', () => {
    const zonas = def().zonasApertura(elemento('armario-esquinero', 0, 0, 0))
    expect(zonas).toHaveLength(2)
    expect(zonas.every((z) => z.nombre === 'la puerta')).toBe(true)
    // Las dos barren el hueco de la L, delante de su frente.
    for (const z of zonas) expect(contienePunto(z.huella, { x: 20, y: 20 })).toBe(true)
  })

  it('un lado con menos de 30 cm libres desde el rincón no lleva puerta', () => {
    // Fondo 85 con 58 de profundidad: el ala deja 27 cm de frente.
    expect(def().zonasApertura(elemento('armario-esquinero', 0, 0, 0, { fondo: 85 }))).toHaveLength(1)
    expect(def().zonasApertura(elemento('armario-esquinero', 0, 0, 0, { ancho: 85, fondo: 85 }))).toHaveLength(0)
  })

  it('en el rincón de un dormitorio, pegado a las dos paredes: sin avisos', () => {
    const doc = documentoNuevo('dormitorio', 400, 330, 250)
    const e: Elemento = elemento('armario-esquinero', 55, 55, 0)
    doc.elementos = [e]
    expect(detectarConflictos(doc, catalogoBase)).toEqual([])
  })
})

describe('armario esquinero: reflejo, hojas, rincón y nombre', () => {
  it('con el rincón a la derecha, volúmenes y puertas se reflejan y las puertas siguen en el hueco', () => {
    const e = elemento('armario-esquinero', 0, 0, 0, {}, { rincon: 'derecha' })
    const vols = def().volumenes(e)
    const dentro = (p: { x: number; y: number }) => vols.some((v) => contienePunto(v.huella, p))
    expect(dentro({ x: 40, y: 40 })).toBe(true) // el ala, ahora a la derecha
    expect(dentro({ x: -30, y: 30 })).toBe(false) // el hueco, a la izquierda
    for (const z of def().zonasApertura(e)) expect(contienePunto(z.huella, { x: -20, y: 20 })).toBe(true)
  })

  it('un frente ancho lleva varias hojas de 60 cm como mucho, no una puerta enorme', () => {
    // 200 de ancho con 35 de profundidad: el frente del fondo mide 165 → tres hojas de 55.
    const e = elemento('armario-esquinero', 0, 0, 0, { ancho: 200 }, { profundidad: 35 })
    expect(def().zonasApertura(e)).toHaveLength(3 + 2)
  })

  it('el 3D tapa el rincón interior: no queda un hueco a toda altura entre los cuerpos', () => {
    const e = elemento('armario-esquinero', 0, 0, 0)
    const piezas = def().modelo3d!(e).filter((p) => p.forma === 'caja')
    // El rincón de dentro de la L (x = 3, y = 3) lo cubre alguna pieza, a media altura.
    const cubre = piezas.some((p) => p.forma === 'caja' && p.x0 <= 1 && p.x1 >= 1 && p.y0 <= 1 && p.y1 >= 1 && p.z0 <= 100 && p.z1 >= 100)
    expect(cubre).toBe(true)
  })

  it('el nombre va sobre el lado largo: con el ala más larga, sobre el ala', () => {
    const ancho = def().posicionNombre!(elemento('armario-esquinero', 0, 0, 0, { ancho: 110, fondo: 200 }))
    expect(ancho.y).toBeGreaterThan(0)
    expect(ancho.x).toBeLessThan(0)
  })
})
