import { describe, expect, it } from 'vitest'
import { catalogoBase } from './catalogoBase'
import type { PiezaLocal } from '../modelo3d/tipos'
import type { Elemento } from '../modelo/documento'
import { elemento } from './definiciones/ayuda.test-util'

const TIPOS = ['cama', 'armario', 'comoda', 'mesita', 'escritorio', 'silla', 'estanteria', 'sofa', 'sillon', 'mesa-centro', 'mueble-tv', 'mesa', 'aparador']

function piezasDe(e: Elemento): PiezaLocal[] {
  const def = catalogoBase.get(e.tipo)
  if (!def?.modelo3d) throw new Error(`sin modelo3d: ${e.tipo}`)
  return def.modelo3d(e)
}

function ancho(p: PiezaLocal): [number, number, number, number, number, number] {
  return p.forma === 'caja'
    ? [p.x0, p.y0, p.z0, p.x1, p.y1, p.z1]
    : [p.cx - p.r, p.cy - p.r, p.z0, p.cx + p.r, p.cy + p.r, p.z1]
}

const frentesDe = (ps: PiezaLocal[], e: Elemento) =>
  ps.filter((p) => p.forma === 'caja' && Math.abs(p.y1 - (e.medidas.fondo / 2 - 1.5)) < 1e-9 && p.y1 - p.y0 === 2)

describe('generadores 3D de dormitorio y salón', () => {
  it('la mesa no deforma las patas al estirarla', () => {
    for (const w of [60, 300]) {
      const patas = piezasDe(elemento('mesa', 0, 0, 0, { ancho: w })).filter((p) => p.zona === 'patas')
      expect(patas).toHaveLength(4)
      for (const p of patas) {
        const [x0, y0, , x1, y1] = ancho(p)
        expect(x1 - x0).toBe(5)
        expect(y1 - y0).toBe(5)
      }
    }
  })
  it('armario abatible: 2 frentes por módulo; correderas: 2', () => {
    expect(frentesDe(piezasDe(elemento('armario', 0, 0, 0, {}, { modulos: 1 })), elemento('armario', 0, 0, 0))).toHaveLength(2)
    expect(frentesDe(piezasDe(elemento('armario', 0, 0, 0, { ancho: 300 }, { modulos: 4 })), elemento('armario', 0, 0, 0))).toHaveLength(8)
    const corr = elemento('armario', 0, 0, 0, {}, { puertas: 'correderas', modulos: 3 })
    expect(piezasDe(corr).filter((p) => p.forma === 'caja' && p.y1 - p.y0 === 1)).toHaveLength(2)
  })
  it('cómoda con 6 cajones: 6 frentes', () => {
    const e = elemento('comoda', 0, 0, 0, {}, { cajones: 6 })
    expect(frentesDe(piezasDe(e), e)).toHaveLength(6)
  })
  it('sofá de 2 plazas: 2 cojines', () => {
    const e = elemento('sofa', 0, 0, 0, {}, { plazas: 2 })
    const cojines = piezasDe(e).filter((p) => p.forma === 'caja' && p.z1 - p.z0 === 12 && p.y1 === e.medidas.fondo / 2 && p.y0 === -e.medidas.fondo / 2 + 20)
    expect(cojines).toHaveLength(2)
  })
  it('sofá con chaise izquierda: piezas en el lado izquierdo que pasan del frente', () => {
    const e = elemento('sofa', 0, 0, 0, {}, { chaise: 'izquierda' })
    const { ancho: w, fondo } = e.medidas
    const fuera = piezasDe(e).filter((p) => { const [x0, , , , y1] = ancho(p); return x0 < -w / 2 + 90 && y1 > fondo / 2 })
    expect(fuera.length).toBeGreaterThan(0)
  })
  it('estantería de 180: 4 baldas más base y techo', () => {
    const e = elemento('estanteria', 0, 0, 0, { alto: 180 })
    const horizontales = piezasDe(e).filter((p) => p.forma === 'caja' && p.x1 - p.x0 === e.medidas.ancho - 6)
    expect(horizontales).toHaveLength(6)
  })
  it('los tiradores de frentes estrechos no se solapan ni salen del frente', () => {
    for (const [w, modulos] of [[40, 2], [40, 4], [80, 4], [100, 1]]) {
      const e = elemento('armario', 0, 0, 0, { ancho: w }, { modulos })
      const ts = piezasDe(e).filter((p): p is Extract<PiezaLocal, { forma: 'caja' }> => p.forma === 'caja' && p.y1 === e.medidas.fondo / 2 && p.y1 - p.y0 === 1.5).sort((a, b) => a.x0 - b.x0)
      for (let i = 0; i < ts.length; i++) {
        expect(ts[i].x0, `${w}/${modulos}`).toBeGreaterThanOrEqual(-w / 2)
        expect(ts[i].x1).toBeLessThanOrEqual(w / 2)
        if (i > 0) expect(ts[i].x0).toBeGreaterThan(ts[i - 1].x1)
      }
    }
  })
  it('cada zona usada existe en zonasColor', () => {
    for (const t of TIPOS) {
      const claves = catalogoBase.get(t)!.zonasColor.map((z) => z.clave)
      for (const p of piezasDe(elemento(t, 0, 0, 0))) expect(claves, t).toContain(p.zona)
    }
  })
  it('ninguna pieza sale de la caja envolvente de los volúmenes (±0,1 cm)', () => {
    const casos: [string, Partial<Elemento['medidas']>, Elemento['variantes']][] = []
    for (const t of TIPOS) casos.push([t, {}, {}])
    casos.push(['cama', {}, { cabecero: false }], ['cama', { alto: 20 }, {}], ['armario', {}, { puertas: 'correderas' }],
      ['armario', { ancho: 400 }, { modulos: 4 }], ['armario', { ancho: 40 }, { modulos: 4 }], ['armario', { ancho: 80 }, { modulos: 4 }], ['armario', { ancho: 40 }, { modulos: 2 }], ['sofa', {}, { chaise: 'izquierda' }], ['sofa', { ancho: 140, alto: 70 }, { chaise: 'derecha', plazas: 2 }],
      ['mesita', {}, { cajon: false }], ['mueble-tv', {}, { puertas: 0 }], ['comoda', { alto: 50 }, { cajones: 6 }])
    for (const [t, medidas, variantes] of casos) {
      const e = elemento(t, 0, 0, 0, medidas, variantes)
      const vols = catalogoBase.get(t)!.volumenes(e)
      const xs = vols.flatMap((v) => v.huella.map((p) => p.x))
      const ys = vols.flatMap((v) => v.huella.map((p) => p.y))
      const zMin = Math.min(...vols.map((v) => v.zMin))
      const zMax = Math.max(...vols.map((v) => v.zMax))
      const tol = 0.1
      for (const p of piezasDe(e)) {
        const [x0, y0, z0, x1, y1, z1] = ancho(p)
        const msg = `${t} ${JSON.stringify(variantes)} ${JSON.stringify(p)}`
        expect(x0, msg).toBeGreaterThanOrEqual(Math.min(...xs) - tol)
        expect(x1, msg).toBeLessThanOrEqual(Math.max(...xs) + tol)
        expect(y0, msg).toBeGreaterThanOrEqual(Math.min(...ys) - tol)
        expect(y1, msg).toBeLessThanOrEqual(Math.max(...ys) + tol)
        expect(z0, msg).toBeGreaterThanOrEqual(zMin - tol)
        expect(z1, msg).toBeLessThanOrEqual(zMax + tol)
      }
    }
  })
})
