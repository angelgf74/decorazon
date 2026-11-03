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
    expect(d.variantes.map((v) => [v.clave, v.defecto])).toEqual([['rincon', 'izquierda']])
    expect(d.medidasExtra!.map((m) => [m.clave, m.rango])).toEqual([
      ['profundidadFondo', { min: 30, max: 70, defecto: 58 }], ['anchoAla', { min: 30, max: 70, defecto: 58 }],
      ['huecoAncho', { min: 0, max: 40, defecto: 0 }], ['huecoFondo', { min: 0, max: 70, defecto: 0 }],
    ])
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

describe('armario esquinero con hueco en el rincón', () => {
  // El PAX / GRIMO: 111 × 111 × 201, fondo y ala de 58, hueco de 11 × 58. Centro en (55,5, 55,5): rincón en (0, 0).
  const pax = (extra: Record<string, number> = {}, variantes: Elemento['variantes'] = {}): Elemento => ({
    ...elemento('armario-esquinero', 55.5, 55.5, 0, { ancho: 111, fondo: 111, alto: 201 }, variantes),
    medidasExtra: { profundidadFondo: 58, anchoAla: 58, huecoAncho: 11, huecoFondo: 58, ...extra },
  })
  const redondo = (h: { x: number; y: number }[]) => h.map((p) => [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10])

  it('la huella del ejemplo: 8 vértices desde el rincón', () => {
    const [h] = huellasEnPlanta(def(), pax())
    expect(redondo(h!)).toEqual([[11, 0], [111, 0], [111, 58], [58, 58], [58, 111], [0, 111], [0, 58], [11, 58]])
  })

  it('con el hueco a 0, la L de 6 vértices de siempre', () => {
    const [h] = huellasEnPlanta(def(), pax({ huecoAncho: 0, huecoFondo: 0 }))
    expect(h).toHaveLength(6)
    // Con solo una de las dos a 0 tampoco hay hueco.
    expect(huellasEnPlanta(def(), pax({ huecoFondo: 0 }))[0]).toHaveLength(6)
  })

  it('una columna de 10 × 40 pegada al rincón cabe en el hueco; sin hueco, choca', () => {
    const doc = documentoNuevo('dormitorio', 400, 330, 250)
    doc.estructura = [{ id: 'c', tipo: 'columna', centro: { x: 5, y: 20 }, ancho: 10, fondo: 40, rotacion: 0 }]
    doc.elementos = [pax()]
    expect(detectarConflictos(doc, catalogoBase)).toEqual([])
    doc.elementos = [pax({ huecoAncho: 0, huecoFondo: 0 })]
    expect(detectarConflictos(doc, catalogoBase).some((c) => c.gravedad === 'error')).toBe(true)
  })

  it('el ala y el fondo pueden medir distinto', () => {
    const vols = def().volumenes(pax({ anchoAla: 40, huecoAncho: 0, huecoFondo: 0 }))
    const dentro = (p: { x: number; y: number }) => vols.some((v) => contienePunto(v.huella, p))
    expect(dentro({ x: 35, y: 100 })).toBe(true)
    expect(dentro({ x: 45, y: 100 })).toBe(false)
  })

  it('los límites: siempre queda frente y los cuerpos siguen unidos; el hueco no pasa del cuerpo del fondo', () => {
    // Hueco de 40 con un ala de 45: se queda en 35, y los cuerpos se tocan 10 cm.
    const [h] = huellasEnPlanta(def(), pax({ anchoAla: 45, huecoAncho: 40 }))
    expect(Math.min(...h!.filter((p) => p.y < 1).map((p) => p.x))).toBeCloseTo(35)
    // Hueco de fondo 70 con un cuerpo del fondo de 58: se queda en 58.
    const [h2] = huellasEnPlanta(def(), pax({ huecoFondo: 70 }))
    expect(Math.max(...h2!.filter((p) => p.x < 1).map((p) => p.y).filter((y) => y < 100))).toBeCloseTo(58)
  })

  it('con el rincón a la derecha, el hueco va en el rincón de la derecha', () => {
    const e = { ...pax({}, { rincon: 'derecha' }) }
    const vols = def().volumenes(e)
    const dentro = (p: { x: number; y: number }) => vols.some((v) => contienePunto(v.huella, p))
    expect(dentro({ x: 111 - 5, y: 20 })).toBe(false) // el hueco, ahora contra la pared derecha
    expect(dentro({ x: 5, y: 20 })).toBe(true)
  })

  it('un esquinero guardado por la versión anterior (variante de profundidad, sin medidas extra) se ve igual', () => {
    const viejo = elemento('armario-esquinero', 0, 0, 0, {}, { profundidad: 35 })
    expect(viejo.medidasExtra).toBeUndefined()
    const [h] = huellasEnPlanta(def(), viejo)
    // 110 × 110 con 35: el ala llega hasta y = 55 de x = -55 a x = -20.
    const abajo = h!.filter((p) => Math.abs(p.y - 55) < 1e-9).map((p) => p.x).sort((a, b) => a - b)
    expect(abajo).toEqual([-55, -20])
  })
})

describe('armario esquinero: integridad con valores extremos', () => {
  const extremos = (r: { min: number; max: number }) => [r.min, r.max]
  const casos: Elemento[] = []
  for (const ancho of extremos(def().medidas.ancho)) for (const fondo of extremos(def().medidas.fondo)) {
    for (const pF of [30, 70]) for (const aA of [30, 70]) for (const hx of [0, 40]) for (const hy of [0, 70]) for (const rincon of ['izquierda', 'derecha']) {
      casos.push({ ...elemento('armario-esquinero', 0, 0, 0, { ancho, fondo }, { rincon }), medidasExtra: { profundidadFondo: pF, anchoAla: aA, huecoAncho: hx, huecoFondo: hy } })
    }
  }

  it('la huella tiene de 6 a 8 vértices, sin repetidos', () => {
    for (const e of casos) {
      const [h] = huellasEnPlanta(def(), e)
      expect(h!.length).toBeGreaterThanOrEqual(6)
      expect(h!.length).toBeLessThanOrEqual(8)
      expect(new Set(h!.map((p) => `${p.x},${p.y}`)).size).toBe(h!.length)
    }
  })

  it('cada pieza 3D tiene su centro dentro de un volumen y las cajas no se solapan', () => {
    for (const e of casos) {
      const vols = def().volumenes(e)
      const cajas = def().modelo3d!(e).filter((p) => p.forma === 'caja')
      for (const p of cajas) {
        if (p.forma !== 'caja') continue
        const c = { x: e.posicion.x + (p.x0 + p.x1) / 2, y: e.posicion.y + (p.y0 + p.y1) / 2 }
        expect(vols.some((v) => contienePunto(v.huella, c))).toBe(true)
      }
      for (let i = 0; i < cajas.length; i++) for (let j = i + 1; j < cajas.length; j++) {
        const a = cajas[i]!, b = cajas[j]!
        if (a.forma !== 'caja' || b.forma !== 'caja') continue
        const solape = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 1e-6 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 1e-6 && Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) > 1e-6
        expect(solape).toBe(false)
      }
    }
  })
})
