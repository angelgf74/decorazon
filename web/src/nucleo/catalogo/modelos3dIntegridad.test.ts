import { describe, expect, it } from 'vitest'
import { catalogoBase } from './catalogoBase'
import type { DefinicionTipo } from './tipos'
import type { Elemento } from '../modelo/documento'
import type { PiezaLocal } from '../modelo3d/tipos'
import { piezasDeElemento } from '../modelo3d/escena'
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

function limites(p: PiezaLocal): [number, number, number, number, number, number] {
  return p.forma === 'caja'
    ? [p.x0, p.y0, p.z0, p.x1, p.y1, p.z1]
    : [p.cx - p.r, p.cy - p.r, p.z0, p.cx + p.r, p.cy + p.r, p.z1]
}

describe('integridad de los generadores 3D del catálogo', () => {
  for (const def of catalogoBase.values()) {
    it(`${def.id}: piezas válidas, dentro de los volúmenes y con zonas existentes`, () => {
      expect(def.modelo3d, 'modelo3d').toBeDefined()
      const claves = def.zonasColor.map((z) => z.clave)
      for (const [medidas, variantes] of combinaciones(def)) {
        const e = elemento(def.id, 0, 0, 0, medidas, variantes)
        const piezas = def.modelo3d!(e)
        const ctx = `${def.id} ${JSON.stringify(e.medidas)} ${JSON.stringify(variantes)}`
        expect(piezas.length, ctx).toBeGreaterThanOrEqual(1)
        expect(piezas.length, ctx).toBeLessThanOrEqual(60)
        const vols = def.volumenes(e)
        const xs = vols.flatMap((v) => v.huella.map((q) => q.x))
        const ys = vols.flatMap((v) => v.huella.map((q) => q.y))
        const zMin = Math.min(...vols.map((v) => v.zMin)) - e.alturaSuelo
        const zMax = Math.max(...vols.map((v) => v.zMax)) - e.alturaSuelo
        for (const p of piezas) {
          const msg = `${ctx} ${JSON.stringify(p)}`
          const [x0, y0, z0, x1, y1, z1] = limites(p)
          if (p.forma === 'caja') {
            expect(x1, msg).toBeGreaterThan(x0)
            expect(y1, msg).toBeGreaterThan(y0)
          } else expect(p.r, msg).toBeGreaterThan(0)
          expect(z1, msg).toBeGreaterThan(z0)
          expect(x0, msg).toBeGreaterThanOrEqual(Math.min(...xs) - TOL)
          expect(x1, msg).toBeLessThanOrEqual(Math.max(...xs) + TOL)
          expect(y0, msg).toBeGreaterThanOrEqual(Math.min(...ys) - TOL)
          expect(y1, msg).toBeLessThanOrEqual(Math.max(...ys) + TOL)
          // El fregadero hunde la cubeta bajo la encimera: única salida admitida, y solo en z.
          if (def.id !== 'fregadero') expect(z0, msg).toBeGreaterThanOrEqual(zMin - TOL)
          expect(z1, msg).toBeLessThanOrEqual(zMax + TOL)
          if (p.material === undefined) expect(claves, msg).toContain(p.zona)
        }
      }
    })

    it(`${def.id}: girado 37°, el centro en planta de cada caja cae dentro de los volúmenes`, () => {
      for (const [medidas, variantes] of combinaciones(def)) {
        const base = elemento(def.id, 500, 300, 37, medidas, variantes)
        const huellas = def.volumenes(base).map((v) => desplazarPoligono(v.huella, TOL))
        for (const p of piezasDeElemento(base, def)) {
          if (p.forma !== 'caja') continue
          const c = { x: p.centro[0] * 100, y: p.centro[2] * 100 }
          expect(huellas.some((h) => contienePunto(h, c)), `${def.id} ${JSON.stringify(c)}`).toBe(true)
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
    const maxFrente = Math.max(...cajas(piezasDeTipo(e60)).filter((p) => p.zona === 'cuerpo').map((p) => p.y1))
    expect(maxFrente).toBe(28)
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

  it('fregadero: marco de 4 piezas que baja 18 cm bajo la encimera, y grifo', () => {
    const ps = piezas('fregadero')
    const marco = cajas(ps)
    expect(marco).toHaveLength(4)
    expect(Math.min(...marco.map((p) => p.z0))).toBe(-18)
    expect(ps.filter((p) => p.forma === 'cilindro').length).toBeGreaterThanOrEqual(2)
  })

  it('cortina: 2 paños de 5 cajas que alternan el fondo, y barra de metal', () => {
    const ps = cajas(piezas('cortina'))
    const panos = ps.filter((p) => p.material === undefined)
    expect(panos).toHaveLength(10)
    expect(new Set(panos.map((p) => p.y0)).size).toBe(2)
    expect(ps.filter((p) => p.material === 'metal')).toHaveLength(1)
  })

  it('cuadro: marco de 4 listones de 3 cm y lámina; planta: maceta y 3 copas', () => {
    expect(cajas(piezas('cuadro')).filter((p) => p.zona === 'marco')).toHaveLength(4)
    expect(piezas('planta').filter((p) => p.zona === 'hojas')).toHaveLength(3)
  })
})

function piezasDeTipo(e: Elemento): PiezaLocal[] {
  return catalogoBase.get(e.tipo)!.modelo3d!(e)
}
