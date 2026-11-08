import { describe, expect, it } from 'vitest'
import { catalogoBase } from './catalogoBase'
import type { PiezaLocal } from '../modelo3d/tipos'
import type { Elemento } from '../modelo/documento'
import { elemento } from './definiciones/ayuda.test-util'
import { caja, cajonesApilados, cojinesEnTramo, patas4 } from './modelos'
import { valoresVariante } from './tipos'

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

type Caja = Extract<PiezaLocal, { forma: 'caja' }>
const cajas = (ps: PiezaLocal[]) => ps.filter((p): p is Caja => p.forma === 'caja')
/** Cojines de asiento: tapizado redondeado que llega al frente, de 10 a 14 cm de grueso. */
const cojinesDeAsiento = (ps: PiezaLocal[], fondo: number) =>
  cajas(ps).filter((p) => p.zona === 'tapizado' && p.radio !== undefined && p.y1 === fondo / 2 && p.z1 - p.z0 >= 10 && p.z1 - p.z0 <= 14)
/** Cojines de respaldo: delante del armazón de 8 cm, hasta 20 cm del fondo. */
const cojinesDeRespaldo = (ps: PiezaLocal[], fondo: number) =>
  cajas(ps).filter((p) => p.zona === 'tapizado' && p.radio !== undefined && p.y0 === -fondo / 2 + 8 && p.y1 === -fondo / 2 + 20)

const frentesDe = (ps: PiezaLocal[], e: Elemento) =>
  ps.filter((p) => p.forma === 'caja' && Math.abs(p.y1 - (e.medidas.fondo / 2 - 1.5)) < 1e-9 && p.y1 - p.y0 === 2)

describe('caja', () => {
  it('sin radio no lleva la clave (los toEqual de siempre no cambian); con radio, la lleva', () => {
    expect(caja(0, 0, 0, 1, 1, 1, 'z')).not.toHaveProperty('radio')
    expect(caja(0, 0, 0, 10, 10, 10, 'z', 3)).toMatchObject({ forma: 'caja', radio: 3 })
  })
})

describe('generadores 3D de dormitorio y salón', () => {
  it('el tablero de la mesa lleva el canto redondeado (radio 1 en 3 cm de grueso)', () => {
    const tablero = cajas(piezasDe(elemento('mesa', 0, 0, 0))).find((p) => p.zona === 'tablero')!
    expect(tablero.z1 - tablero.z0).toBe(3)
    expect(tablero.radio).toBe(1)
  })
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
  it('sofá: un cojín de asiento y uno de respaldo por plaza, redondeados', () => {
    for (const plazas of [2, 3]) {
      const e = elemento('sofa', 0, 0, 0, {}, { plazas })
      const f = e.medidas.fondo
      expect(cojinesDeAsiento(piezasDe(e), f), `asiento ${plazas}`).toHaveLength(plazas)
      expect(cojinesDeRespaldo(piezasDe(e), f), `respaldo ${plazas}`).toHaveLength(plazas)
    }
  })
  it('todo el tapizado del sofá lleva radio; las patas, no', () => {
    const ps = piezasDe(elemento('sofa', 0, 0, 0))
    for (const p of ps) if (p.forma === 'caja') expect(p.radio !== undefined, JSON.stringify(p)).toBe(p.zona === 'tapizado')
  })
  it('sillón de 60 de ancho: un cojín de asiento y uno de respaldo de 28 (1 cm de aire a cada lado del hueco entre brazos)', () => {
    const e = elemento('sillon', 0, 0, 0, { ancho: 60 })
    const f = e.medidas.fondo
    const [asiento] = cojinesDeAsiento(piezasDe(e), f)
    const [respaldo] = cojinesDeRespaldo(piezasDe(e), f)
    expect(cojinesDeAsiento(piezasDe(e), f)).toHaveLength(1)
    expect(asiento!.x1 - asiento!.x0).toBeCloseTo(30)
    expect(respaldo!.x1 - respaldo!.x0).toBeCloseTo(28)
  })
  it('cojinesEnTramo reparte el tramo en cojines de 70 como mucho, contiguos con 0,4 de hueco', () => {
    const tres = cojinesEnTramo(0, 165)
    expect(tres).toHaveLength(3)
    expect(tres[0]![0]).toBe(0)
    expect(tres[2]![1]).toBeCloseTo(165)
    for (const [x0, x1] of tres) expect(x1 - x0).toBeCloseTo((165 - 0.8) / 3)
    expect(tres[1]![0] - tres[0]![1]).toBeCloseTo(0.4)
    expect(cojinesEnTramo(0, 45)).toEqual([[0, 45]])
  })
  it('rinconera 260 × 200: cojines por tramos en los dos lados (6 de asiento, 7 de respaldo), todos redondeados', () => {
    const e = elemento('sofa-rinconera', 0, 0, 0)
    const ps = cajas(piezasDe(e))
    const { alto } = e.medidas
    const asiento = ps.filter((p) => p.zona === 'tapizado' && p.z1 - p.z0 === 12 && p.z1 === alto - 40)
    const respaldo = ps.filter((p) => p.zona === 'tapizado' && p.z1 === alto - 4)
    expect(asiento).toHaveLength(6)
    expect(respaldo).toHaveLength(7)
    for (const p of [...asiento, ...respaldo]) expect(p.radio).toBe(5)
    for (const p of ps) if (p.zona === 'tapizado') expect(p.radio, JSON.stringify(p)).toBeDefined()
    // Ningún cojín de asiento pasa de 70 de largo en su dirección.
    for (const p of asiento) expect(Math.min(p.x1 - p.x0, p.y1 - p.y0)).toBeLessThanOrEqual(70.01)
  })
  it('rinconera con el rincón a la derecha: el ala (cojines de 70 de ancho) queda en x positivo; la mayor, 340 × 260, tiene 28 piezas', () => {
    const der = cajas(piezasDe(elemento('sofa-rinconera', 0, 0, 0, {}, { rincon: 'derecha' })))
    const ala = der.filter((p) => p.zona === 'tapizado' && p.z1 - p.z0 === 12 && Math.abs(p.x1 - p.x0 - 70) < 1e-9)
    expect(ala.length).toBeGreaterThan(0)
    for (const p of ala) expect(p.x0).toBeGreaterThan(0)
    expect(piezasDe(elemento('sofa-rinconera', 0, 0, 0, { ancho: 340, fondo: 260 }))).toHaveLength(28)
  })
  it('sofá cama abierto: el colchón que sale lleva radio 4', () => {
    const colchon = piezasDe(elemento('sofa-cama', 0, 0, 0, {}, { abierto: true })).filter((p) => p.zona === 'colchon')
    expect(colchon).toHaveLength(1)
    expect(colchon[0]).toMatchObject({ forma: 'caja', radio: 4 })
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

describe('cajonesApilados', () => {
  it('sin sitio para el tirador no emite tiradores de ancho 0', () => {
    const e = elemento('comoda', 0, 0, 0, { ancho: 3 })
    const ps = cajonesApilados(e, 2, 1, 40, 'cuerpo')
    expect(ps).toHaveLength(2)
    expect(ps.every((p) => p.forma === 'caja' && p.x1 > p.x0 && p.y1 - p.y0 === 2)).toBe(true)
  })
})

describe('patas redondas (plan 28c)', () => {
  const cilindros = (ps: PiezaLocal[]) => ps.filter((p): p is Extract<PiezaLocal, { forma: 'cilindro' }> => p.forma === 'cilindro')
  it('patas4 con «redondas» da cuatro cilindros del mismo diámetro que el lado, centrados donde iban las cajas', () => {
    const e = elemento('mesa', 0, 0, 0)
    const cuadradas = cajas(patas4(e, 5, 72, 'patas'))
    const redondas = cilindros(patas4(e, 5, 72, 'patas', 3, 'redondas'))
    expect(redondas).toHaveLength(4)
    for (const [i, c] of redondas.entries()) {
      expect(c.r).toBe(2.5)
      expect([c.z0, c.z1]).toEqual([0, 72])
      expect(c.cx).toBeCloseTo((cuadradas[i]!.x0 + cuadradas[i]!.x1) / 2)
      expect(c.cy).toBeCloseTo((cuadradas[i]!.y0 + cuadradas[i]!.y1) / 2)
    }
  })
  it('mesa, mesa alta, mesa auxiliar, silla y taburete admiten patas redondas; la mesa de reuniones solo si no es ovalada (que ya las lleva)', () => {
    for (const tipo of ['mesa', 'mesa-alta', 'mesa-auxiliar', 'silla', 'taburete', 'mesa-reuniones']) {
      const def = catalogoBase.get(tipo)!
      expect(def.variantes.map((v) => v.clave), tipo).toContain('patas')
      const redondas = cilindros(def.modelo3d!(elemento(tipo, 0, 0, 0, {}, { patas: 'redondas', forma: tipo === 'mesa-auxiliar' ? 'cuadrada' : 'rectangular' })))
      expect(redondas.length, tipo).toBeGreaterThanOrEqual(4)
      expect(cilindros(def.modelo3d!(elemento(tipo, 0, 0, 0, {}, { patas: 'cuadradas', forma: tipo === 'mesa-auxiliar' ? 'cuadrada' : 'rectangular' }))), tipo).toHaveLength(0)
    }
    const ovalada = elemento('mesa-reuniones', 0, 0, 0, {}, { forma: 'ovalada' })
    expect(valoresVariante(catalogoBase.get('mesa-reuniones')!, ovalada, 'patas')).toEqual(['redondas'])
  })
})
