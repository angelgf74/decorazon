import { describe, expect, it } from 'vitest'
import { catalogoBase } from './catalogoBase'
import type { DefinicionTipo } from './tipos'
import type { Elemento } from '../modelo/documento'
import type { PiezaLocal } from '../modelo3d/tipos'
import { cajaDePieza, contornoEncogido } from '../modelo3d/formas'
import { aMundo } from './transformar'
import { contienePunto, desplazarPoligono } from '../geometria/poligono'
import { elemento } from './definiciones/ayuda.test-util'

const TOL = 0.1

function combinaciones(def: DefinicionTipo): [Partial<Elemento['medidas']>, Elemento['variantes']][] {
  const rango = (r: { min: number; defecto: number; max: number }) => [r.min, r.defecto, r.max]
  const medidas = rango(def.medidas.ancho).flatMap((ancho) =>
    rango(def.medidas.fondo).flatMap((fondo) => rango(def.medidas.alto).map((alto) => ({ ancho, fondo, alto }))))
  let variantes: Elemento['variantes'][] = [{}]
  for (const v of def.variantes) variantes = variantes.flatMap((acc) => v.valores.map((valor) => ({ ...acc, [v.clave]: valor })))
  return medidas.flatMap((m) => variantes.map((v): [Partial<Elemento['medidas']>, Elemento['variantes']] => [m, v]))
}

/** Lo que cada forma necesita para pintarse sin deformarse (la caja envolvente se comprueba aparte). */
function comprobarForma(p: PiezaLocal, msg: string) {
  const { x0, y0, z0, x1, y1, z1 } = cajaDePieza(p)
  switch (p.forma) {
    case 'caja':
      expect(x1, msg).toBeGreaterThan(x0)
      expect(y1, msg).toBeGreaterThan(y0)
      // Un redondeo mayor que medio lado menor deforma la caja (RoundedBoxGeometry la encoge).
      if (p.radio !== undefined) {
        expect(p.radio, msg).toBeGreaterThan(0)
        expect(p.radio, msg).toBeLessThanOrEqual(Math.min(x1 - x0, y1 - y0, z1 - z0) / 2 + 1e-9)
      }
      break
    case 'cilindro':
      expect(p.r, msg).toBeGreaterThan(0)
      break
    case 'revolucion':
      expect(p.perfil.length, msg).toBeGreaterThanOrEqual(2)
      expect(p.perfil.every(([r]) => r >= 0), msg).toBe(true)
      expect(Math.max(...p.perfil.map(([r]) => r)), msg).toBeGreaterThan(0)
      expect(p.lados ?? 3, msg).toBeGreaterThanOrEqual(3)
      expect(p.escalaY ?? 1, msg).toBeGreaterThan(0)
      break
    case 'extrusion':
      expect(p.contorno.length, msg).toBeGreaterThanOrEqual(3)
      expect(p.hasta, msg).toBeGreaterThan(p.desde)
      if (p.radio !== undefined) {
        // El bisel encoge el contorno el radio y lo vuelve a crecer: sin huecos, sin pasar de medio grueso y sin que ninguna
        // arista del contorno encogido se dé la vuelta (el contorno sería más estrecho que dos radios).
        expect(p.radio, msg).toBeGreaterThan(0)
        expect(p.huecos ?? [], msg).toHaveLength(0)
        expect(p.radio, msg).toBeLessThanOrEqual((p.hasta - p.desde) / 2 + 1e-9)
        const encogido = contornoEncogido(p.contorno, p.radio)
        const n = p.contorno.length
        p.contorno.forEach(([ax, ay], i) => {
          const [bx, by] = p.contorno[(i + 1) % n]!
          const [cx, cy] = encogido[i]!
          const [dx, dy] = encogido[(i + 1) % n]!
          expect((bx - ax) * (dx - cx) + (by - ay) * (dy - cy), msg).toBeGreaterThan(-1e-9)
        })
      }
      break
    case 'tubo':
      expect(p.puntos.length, msg).toBeGreaterThanOrEqual(2)
      expect(p.r, msg).toBeGreaterThan(0)
      expect(p.codo ?? 0, msg).toBeGreaterThanOrEqual(0)
      break
  }
}

describe('integridad de los generadores 3D del catálogo', () => {
  for (const def of catalogoBase.values()) {
    it(`${def.id}: piezas válidas, dentro de los volúmenes y con zonas existentes`, () => {
      expect(def.modelo3d, 'modelo3d').toBeDefined()
      const claves = def.zonasColor.map((z) => z.clave)
      // Con altura editable, también pegado al suelo y a 10 cm: nada puede quedar por debajo del suelo.
      const alturas = def.alturaSueloEditable ? [0, 10, def.alturaSuelo] : [def.alturaSuelo]
      for (const [medidas, variantes] of combinaciones(def)) for (const alturaSuelo of alturas) {
        const e = { ...elemento(def.id, 0, 0, 0, medidas, variantes), alturaSuelo }
        const piezas = def.modelo3d!(e)
        const ctx = `${def.id} ${JSON.stringify(e.medidas)} ${JSON.stringify(variantes)} alturaSuelo=${alturaSuelo}`
        expect(piezas.length, ctx).toBeGreaterThanOrEqual(1)
        expect(piezas.length, ctx).toBeLessThanOrEqual(60)
        const vols = def.volumenes(e)
        const xs = vols.flatMap((v) => v.huella.map((q) => q.x))
        const ys = vols.flatMap((v) => v.huella.map((q) => q.y))
        const zMin = Math.min(...vols.map((v) => v.zMin)) - e.alturaSuelo
        const zMax = Math.max(...vols.map((v) => v.zMax)) - e.alturaSuelo
        for (const p of piezas) {
          const msg = `${ctx} ${JSON.stringify(p)}`
          const { x0, y0, z0, x1, y1, z1 } = cajaDePieza(p)
          comprobarForma(p, msg)
          expect(z1, msg).toBeGreaterThan(z0)
          expect(x0, msg).toBeGreaterThanOrEqual(Math.min(...xs) - TOL)
          expect(x1, msg).toBeLessThanOrEqual(Math.max(...xs) + TOL)
          expect(y0, msg).toBeGreaterThanOrEqual(Math.min(...ys) - TOL)
          expect(y1, msg).toBeLessThanOrEqual(Math.max(...ys) + TOL)
          // El fregadero hunde la cubeta bajo la encimera: única salida admitida, solo en z y nunca por debajo del suelo.
          if (def.id !== 'fregadero') expect(z0, msg).toBeGreaterThanOrEqual(zMin - TOL)
          else expect(z0, msg).toBeGreaterThanOrEqual(-Math.min(18, e.alturaSuelo) - TOL)
          expect(z1, msg).toBeLessThanOrEqual(zMax + TOL)
          if (p.material === undefined) expect(claves, msg).toContain(p.zona)
        }
      }
    })

    it(`${def.id}: girado 37°, el centro en planta de cada pieza cae dentro de los volúmenes`, () => {
      for (const [medidas, variantes] of combinaciones(def)) {
        const base = elemento(def.id, 500, 300, 37, medidas, variantes)
        const huellas = def.volumenes(base).map((v) => desplazarPoligono(v.huella, TOL))
        for (const p of def.modelo3d!(base)) {
          const { x0, y0, x1, y1 } = cajaDePieza(p)
          const c = aMundo(base, { x: (x0 + x1) / 2, y: (y0 + y1) / 2 })
          expect(huellas.some((h) => contienePunto(h, c)), `${def.id} ${p.forma} ${JSON.stringify(c)}`).toBe(true)
        }
      }
    })
  }
})

describe('generadores 3D de cocina y decoración', () => {
  const piezas = (tipo: string, medidas = {}, variantes: Elemento['variantes'] = {}) => catalogoBase.get(tipo)!.modelo3d!(elemento(tipo, 0, 0, 0, medidas, variantes))
  const cajas = (ps: PiezaLocal[]) => ps.filter((p): p is Extract<PiezaLocal, { forma: 'caja' }> => p.forma === 'caja')

  it('módulo bajo: frentes según ancho y variante, encimera hasta el borde y frentes 2 cm por detrás', () => {
    const delante = (p: PiezaLocal) => p.forma === 'caja' && p.y1 - p.y0 === 2 && p.zona === 'cuerpo' && p.z0 >= 9
    const e60 = elemento('modulo-bajo', 0, 0, 0, { ancho: 60 })
    const e90 = elemento('modulo-bajo', 0, 0, 0, { ancho: 90 })
    const ecaj = elemento('modulo-bajo', 0, 0, 0, {}, { frente: 'cajones' })
    expect(piezasDeTipo(e60).filter(delante)).toHaveLength(1)
    expect(piezasDeTipo(e90).filter(delante)).toHaveLength(2)
    expect(piezasDeTipo(ecaj).filter(delante)).toHaveLength(3)
    const enc = cajas(piezasDeTipo(e60)).find((p) => p.zona === 'encimera')!
    expect([enc.y1 - enc.y0, enc.z1 - enc.z0, enc.y1]).toEqual([60, 4, 30])
    // Lo más adelantado del cuerpo es el tirador, que llega al borde del volumen bajo la encimera.
    const maxFrente = Math.max(...piezasDeTipo(e60).filter((p) => p.zona === 'cuerpo').map((p) => cajaDePieza(p).y1))
    expect(maxFrente).toBe(28)
  })

  it('en una hilera de cocina con el mismo fondo, frentes y tiradores quedan en el mismo plano (2 cm por detrás, por la encimera)', () => {
    const tipos = ['modulo-bajo', 'lavavajillas', 'frigorifico', 'columna-cocina']
    const sinEncimera = (tipo: string) => cajas(piezas(tipo, { fondo: 60 })).filter((p) => p.zona !== 'encimera')
    const frente = (tipo: string) => Math.max(...sinEncimera(tipo).filter((p) => p.y1 - p.y0 === 2).map((p) => p.y1))
    const delante = (tipo: string) => Math.max(...piezas(tipo, { fondo: 60 }).filter((p) => p.zona !== 'encimera').map((p) => cajaDePieza(p).y1))
    expect(tipos.map(frente)).toEqual(tipos.map(() => 26.5))
    expect(tipos.map(delante)).toEqual(tipos.map(() => 28))
  })

  it('columna con horno: cristal de vidrio #1f1f1f en z 85-145; con frigorífico, un frente entero', () => {
    const horno = piezas('columna-cocina').find((p) => p.material === 'vidrio')
    expect(horno).toMatchObject({ forma: 'caja', z0: 85, z1: 145, color: '#1f1f1f' })
    const frig = cajas(piezas('columna-cocina', {}, { integrado: 'frigorifico' }))
    expect(frig.some((p) => p.z0 === 9 && p.z1 === 214 && p.y1 - p.y0 === 2)).toBe(true)
    expect(frig.some((p) => p.material === 'vidrio')).toBe(false)
  })

  it('placa: losa y 4 círculos de cocción de 1 mm en metal #3a3a3a', () => {
    const c = piezas('placa').filter((p) => p.forma === 'cilindro')
    expect(c).toHaveLength(4)
    for (const p of c) expect(p).toMatchObject({ material: 'metal', color: '#3a3a3a', z1: 5, z0: 4.9 })
  })

  it('fregadero: marco de 4 piezas que baja 18 cm bajo la encimera, fondo oscuro dentro del reborde y grifo', () => {
    const ps = piezas('fregadero')
    // El reborde llega a la encimera (z 1); el caño del grifo, no.
    const marco = cajas(ps).filter((p) => p.material === undefined && p.z1 === 1)
    expect(marco).toHaveLength(4)
    expect(Math.min(...marco.map((p) => p.z0))).toBe(-18)
    // Sin fondo, el interior del marco es el módulo macizo de debajo: la cubeta no se lee.
    const fondo = cajas(ps).filter((p) => p.material === 'metal' && p.color !== undefined)
    expect(fondo).toHaveLength(1)
    expect(fondo[0]!.color).toBe('#8a8c8d')
    expect(fondo[0]).toMatchObject({ x0: -38, x1: 38, y0: -23, y1: 23, z0: 0, z1: 0.5 })
    expect(ps.filter((p) => p.forma === 'cilindro' || p.forma === 'tubo').length).toBeGreaterThanOrEqual(2)
  })

  it('fregadero: el fondo de la cubeta es el color elegido, más oscuro', () => {
    const rojo = catalogoBase.get('fregadero')!.modelo3d!({ ...elemento('fregadero', 0, 0, 0), colores: { cubeta: '#ff0000' } })
    expect(cajas(rojo).find((p) => p.material === 'metal')?.color).toBe('#b80000')
  })

  it('fregadero: el caño arranca dentro de la base del grifo, sin piezas flotando', () => {
    const ps = piezas('fregadero')
    const [base] = ps.filter((p): p is Extract<PiezaLocal, { forma: 'cilindro' }> => p.forma === 'cilindro')
    const cano = ps.find((p): p is Extract<PiezaLocal, { forma: 'tubo' }> => p.forma === 'tubo')
    const [x, y, z] = cano!.puntos[0]!
    expect(Math.hypot(x - base!.cx, y - base!.cy)).toBeLessThan(base!.r)
    expect(z).toBeGreaterThanOrEqual(base!.z0)
    expect(z).toBeLessThanOrEqual(base!.z1)
  })

  it('fregadero: la cubeta baja min(18, alturaSuelo); pegado al suelo no se hunde', () => {
    const fregadero = catalogoBase.get('fregadero')!
    const fondoMarco = (alturaSuelo: number) =>
      Math.min(...cajas(fregadero.modelo3d!({ ...elemento('fregadero', 0, 0, 0), alturaSuelo })).filter((p) => p.material === undefined).map((p) => p.z0))
    expect(fondoMarco(85)).toBe(-18)
    expect(fondoMarco(18)).toBe(-18)
    expect(fondoMarco(10)).toBe(-10)
    expect(fondoMarco(0)).toBeCloseTo(0)
  })

  it('cortina: 2 paños ondulados (extrusiones en planta, recogidos a los lados) y una barra de tubo de metal de lado a lado', () => {
    const ps = piezas('cortina')
    const panos = ps.filter((p): p is Extract<PiezaLocal, { forma: 'extrusion' }> => p.forma === 'extrusion')
    expect(panos).toHaveLength(2)
    for (const p of panos) {
      expect(p).toMatchObject({ plano: 'planta', desde: 0, hasta: 237, zona: 'tejido' })
      // Ondula: muchos puntos con y distintas, no un rectángulo.
      expect(new Set(p.contorno.map(([, y]) => y.toFixed(3))).size).toBeGreaterThan(8)
    }
    expect(panos.map((p) => [Math.min(...p.contorno.map(([x]) => x)), Math.max(...p.contorno.map(([x]) => x))])).toEqual([[-80, -40], [40, 80]])
    const barra = ps.find((p) => p.forma === 'tubo')
    expect(barra).toMatchObject({ material: 'metal', puntos: [[-80, 0, 238.75], [80, 0, 238.75]] })
  })

})

function piezasDeTipo(e: Elemento): PiezaLocal[] {
  return catalogoBase.get(e.tipo)!.modelo3d!(e)
}
