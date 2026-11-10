import { describe, expect, it } from 'vitest'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { cajaDePieza } from '../../modelo3d/formas'
import { catalogoBase } from '../catalogoBase'
import { elemento } from './ayuda.test-util'

type Forma<F extends PiezaLocal['forma']> = Extract<PiezaLocal, { forma: F }>
const piezas = (tipo: string, variantes = {}, medidas = {}) => catalogoBase.get(tipo)!.modelo3d!(elemento(tipo, 0, 0, 0, medidas, variantes))
const de = <F extends PiezaLocal['forma']>(ps: PiezaLocal[], forma: F, zona?: string) =>
  ps.filter((p): p is Forma<F> => p.forma === forma && (zona === undefined || p.zona === zona))
const radioEn = (p: Forma<'revolucion'>, z: number) => Math.max(...p.perfil.filter(([, pz]) => pz === z).map(([r]) => r))
const zs = (p: Forma<'revolucion'>) => p.perfil.map(([, z]) => z)
/** Un contorno sin esquinas vivas: ningún punto es esquina de su caja. */
const sinEsquinas = (contorno: [number, number][]) => {
  const xs = contorno.map(([x]) => x)
  const ys = contorno.map(([, y]) => y)
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  return !contorno.some(([x, y]) => (Math.abs(x - x0) < 1e-9 || Math.abs(x - x1) < 1e-9) && (Math.abs(y - y0) < 1e-9 || Math.abs(y - y1) < 1e-9))
}

describe('papelera, puf y mesa auxiliar redondos', () => {
  it('papelera: revolución hueca, abierta arriba y más estrecha abajo, ovalada si no es redonda', () => {
    const [cuerpo] = de(piezas('papelera'), 'revolucion')
    expect(cuerpo).toBeDefined()
    expect(radioEn(cuerpo!, 0)).toBeLessThan(15)
    expect(Math.max(...cuerpo!.perfil.map(([r]) => r))).toBe(15)
    // Abierta: arriba no vuelve al eje; el fondo de dentro queda por encima del suelo.
    expect(cuerpo!.perfil.filter(([r, z]) => r === 0 && z === 35)).toHaveLength(0)
    expect(de(piezas('papelera', {}, { ancho: 40, fondo: 20 }), 'revolucion')[0]!.escalaY).toBeCloseTo(0.5)
  })

  it('puf redondo: revolución abombada, más ancha a media altura que arriba y abajo', () => {
    const [puf] = de(piezas('puf'), 'revolucion')
    expect(puf).toBeDefined()
    const r = Math.max(...puf!.perfil.map(([pr]) => pr))
    expect(r).toBe(22.5)
    expect(radioEn(puf!, 0)).toBeLessThan(r)
    expect(radioEn(puf!, 40)).toBeLessThan(r)
  })

  it('puf cuadrado: una caja con las aristas redondeadas de cojín', () => {
    const [caja] = de(piezas('puf', { forma: 'cuadrada' }), 'caja')
    expect(caja?.radio).toBe(5)
  })

  it('mesa auxiliar redonda: tablero de una pieza sin esquinas y pie de revolución que se abre en una base', () => {
    const ps = piezas('mesa-auxiliar', { forma: 'redonda' })
    const [tablero] = de(ps, 'extrusion', 'tablero')
    expect(tablero).toMatchObject({ plano: 'planta', desde: 52, hasta: 55 })
    expect(sinEsquinas(tablero!.contorno)).toBe(true)
    const [pie] = de(ps, 'revolucion', 'pie')
    expect(pie).toBeDefined()
    expect(radioEn(pie!, 0)).toBeGreaterThan(radioEn(pie!, 52))
    expect(Math.max(...zs(pie!))).toBe(52)
    expect(ps).toHaveLength(2)
  })
})

describe('bañera', () => {
  it('las paredes son una extrusión en planta con un hueco de esquinas redondeadas', () => {
    const [paredes] = de(piezas('banera'), 'extrusion', 'banera').filter((p) => p.huecos?.length)
    expect(paredes).toMatchObject({ plano: 'planta', desde: 0, hasta: 58 })
    expect(paredes!.huecos).toHaveLength(1)
    expect(sinEsquinas(paredes!.huecos![0]!)).toBe(true)
  })

  it('dentro, el fondo más oscuro con la misma forma redondeada y un respaldo inclinado en un extremo', () => {
    const ps = piezas('banera')
    const fondo = de(ps, 'extrusion', 'banera').find((p) => p.color !== undefined && p.plano === 'planta')
    expect(fondo).toMatchObject({ desde: 0, hasta: 58 - 42 })
    expect(sinEsquinas(fondo!.contorno)).toBe(true)
    const respaldo = de(ps, 'extrusion', 'banera').find((p) => p.plano === 'alzado')
    expect(respaldo).toBeDefined()
    expect(respaldo!.contorno).toHaveLength(3)
  })

  it('el grifo es un caño de tubo que sale del extremo y baja hacia dentro, sin pasar del borde', () => {
    const [cano] = de(piezas('banera'), 'tubo', 'grifo')
    expect(cano?.codo).toBeGreaterThan(0)
    expect(cajaDePieza(cano!).z1).toBeLessThanOrEqual(58)
  })
})

describe('campana', () => {
  it('en isla, el cuerpo es una pirámide truncada (revolución de 4 lados) que se estrecha hacia la chimenea', () => {
    const [piramide] = de(piezas('campana', { montaje: 'isla' }), 'revolucion', 'cuerpo')
    expect(piramide?.lados).toBe(4)
    expect(radioEn(piramide!, 25)).toBeLessThan(radioEn(piramide!, 8))
  })

  it('en pared, el cuerpo es una cuña de perfil: abajo todo el fondo, arriba solo el de la chimenea, pegada a la pared', () => {
    const [cuna] = de(piezas('campana'), 'extrusion', 'cuerpo')
    expect(cuna?.plano).toBe('perfil')
    const abajo = cuna!.contorno.filter(([, z]) => z === 8).map(([y]) => y)
    const arriba = cuna!.contorno.filter(([, z]) => z === 25).map(([y]) => y)
    expect([Math.min(...abajo), Math.max(...abajo)]).toEqual([-25, 25])
    expect([Math.min(...arriba), Math.max(...arriba)]).toEqual([-25, -3])
  })
})

describe('fregadero, perchero, mesa plegable, silla de oficina, cuadro y espejo', () => {
  it('fregadero: el grifo es una base y un caño de tubo que sube y se dobla hacia la cubeta', () => {
    const [cano] = de(piezas('fregadero'), 'tubo', 'cubeta')
    expect(cano?.codo).toBeGreaterThan(0)
    expect(cano!.puntos.at(-1)![1]).toBeGreaterThan(cano!.puntos[0]![1])
  })

  it('perchero: peana de revolución, poste y cuatro ganchos de tubo curvados hacia arriba', () => {
    const ps = piezas('perchero')
    expect(de(ps, 'revolucion', 'cuerpo').length).toBeGreaterThanOrEqual(1)
    const ganchos = de(ps, 'tubo', 'cuerpo')
    expect(ganchos).toHaveLength(4)
    for (const g of ganchos) expect(g.puntos.at(-1)![2]).toBeGreaterThan(g.puntos[1]![2])
  })

  it('mesa plegable abierta: la escuadra es un triángulo de perfil con el hueco en medio', () => {
    const [escuadra] = de(piezas('mesa-plegable'), 'extrusion', 'soporte')
    expect(escuadra?.plano).toBe('perfil')
    expect(escuadra!.contorno).toHaveLength(3)
    expect(escuadra!.huecos).toHaveLength(1)
  })

  it('silla de oficina: base de cinco brazos de tubo con ruedas, asiento redondeado y respaldo curvo', () => {
    const ps = piezas('silla-oficina')
    // Los brazos de la base van a ras de suelo (los soportes de los apoyabrazos también son tubos, pero arriba).
    expect(de(ps, 'tubo', 'base').filter((t) => Math.max(...t.puntos.map(([, , z]) => z)) < 10)).toHaveLength(5)
    expect(de(ps, 'revolucion', 'base')).toHaveLength(5)
    const asiento = de(ps, 'caja', 'tapizado').find((c) => c.z1 === 48)
    expect(asiento?.radio).toBeGreaterThan(0)
    const [respaldo] = de(ps, 'extrusion', 'tapizado')
    expect(respaldo?.plano).toBe('planta')
  })

  it('cuadro y espejo: el marco es una sola extrusión de alzado con el hueco de la lámina', () => {
    for (const tipo of ['cuadro', 'espejo']) {
      const marcos = de(piezas(tipo), 'extrusion', 'marco').filter((p) => p.material === undefined)
      expect(marcos, tipo).toHaveLength(1)
      expect(marcos[0]).toMatchObject({ plano: 'alzado' })
      expect(marcos[0]!.huecos, tipo).toHaveLength(1)
    }
  })
})
