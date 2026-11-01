import { describe, expect, it } from 'vitest'
import { catalogoBase } from '../catalogoBase'
import { huellasEnPlanta } from '../elemento'
import { documentoNuevo } from '../../modelo/crear'
import { detectarConflictos } from '../../conflictos/detectar'
import { contienePunto } from '../../geometria/poligono'
import type { Elemento } from '../../modelo/documento'
import { elemento } from './ayuda.test-util'

const NUEVOS = ['silla-oficina', 'escritorio-l', 'cajonera', 'archivador', 'mesa-reuniones', 'papelera', 'reposapies']

const def = (id: string) => {
  const d = catalogoBase.get(id)
  if (!d) throw new Error(id)
  return d
}

/** Despacho de 400×400 con el escritorio (120×60×75) en el centro: tablero de x 140 a 260 e y 170 a 230. */
function conEscritorio(...otros: Elemento[]) {
  const doc = documentoNuevo('despacho', 400, 400, 250)
  doc.elementos = [elemento('escritorio', 200, 200, 0, {}, {}, 'escritorio'), ...otros]
  return detectarConflictos(doc, catalogoBase)
}

describe('muebles de despacho', () => {
  it('los siete tipos nuevos están en el catálogo y son del despacho', () => {
    for (const id of NUEVOS) expect(def(id).estancias).toContain('despacho')
  })

  it('silla de oficina: el asiento llega a los brazos si los tiene', () => {
    expect(def('silla-oficina').volumenes(elemento('silla-oficina', 0, 0, 0))[0]).toMatchObject({ zMin: 0, zMax: 68 })
    expect(def('silla-oficina').volumenes(elemento('silla-oficina', 0, 0, 0, {}, { brazos: false }))[0]).toMatchObject({ zMin: 0, zMax: 52 })
    expect(huellasEnPlanta(def('silla-oficina'), elemento('silla-oficina', 0, 0, 0))).toHaveLength(1)
  })

  it('silla de oficina con brazos metida bajo el escritorio hasta el respaldo: sin avisos', () => {
    // Girada 180°: asiento de y 219 a 281 (entra 11 cm bajo el tablero) y respaldo de 273 a 281, fuera.
    expect(conEscritorio(elemento('silla-oficina', 200, 250, 180))).toEqual([])
  })

  it('cajonera y reposapiés caben bajo el escritorio', () => {
    expect(conEscritorio(elemento('cajonera', 225, 200, 0))).toEqual([])
    expect(conEscritorio(elemento('reposapies', 200, 205, 0))).toEqual([])
  })

  it('la cajonera tiene cajones que se abren por delante', () => {
    expect(def('cajonera').zonasApertura(elemento('cajonera', 0, 0, 0))).toHaveLength(1)
  })

  it('escritorio en L: dos tableros y cinco patas; en el plano, la L', () => {
    const derecha = elemento('escritorio-l', 0, 0, 0)
    expect(def('escritorio-l').volumenes(derecha)).toHaveLength(7)
    const [, alaDerecha] = huellasEnPlanta(def('escritorio-l'), derecha)
    expect(Math.min(...alaDerecha!.map((p) => p.x))).toBeGreaterThan(0)
    const [, alaIzquierda] = huellasEnPlanta(def('escritorio-l'), elemento('escritorio-l', 0, 0, 0, {}, { ala: 'izquierda' }))
    expect(Math.max(...alaIzquierda!.map((p) => p.x))).toBeLessThan(0)
  })

  it('escritorio en L: la esquina de dentro queda libre', () => {
    // 160×140 con el ala a la derecha: la esquina libre es la de delante a la izquierda.
    const huellas = huellasEnPlanta(def('escritorio-l'), elemento('escritorio-l', 0, 0, 0))
    expect(huellas.some((h) => contienePunto(h, { x: -60, y: 50 }))).toBe(false)
    expect(huellas.some((h) => contienePunto(h, { x: 60, y: 50 }))).toBe(true)
  })

  it('archivador: cajones según el alto o puertas según el ancho', () => {
    expect(def('archivador').zonasApertura(elemento('archivador', 0, 0, 0))).toHaveLength(1)
    expect(def('archivador').zonasApertura(elemento('archivador', 0, 0, 0, {}, { frente: 'puertas' }))).toHaveLength(1)
    expect(def('archivador').zonasApertura(elemento('archivador', 0, 0, 0, { ancho: 90 }, { frente: 'puertas' }))).toHaveLength(2)
  })

  it('mesa de reuniones ovalada: sin esquinas en el plano y con los extremos redondos en 3D', () => {
    const e = elemento('mesa-reuniones', 0, 0, 0, {}, { forma: 'ovalada' })
    const [huella] = huellasEnPlanta(def('mesa-reuniones'), e)
    expect(contienePunto(huella!, { x: 0, y: 0 })).toBe(true)
    expect(contienePunto(huella!, { x: 118, y: 53 })).toBe(false)
    expect(def('mesa-reuniones').modelo3d!(e).filter((p) => p.forma === 'cilindro' && p.zona === 'tablero')).toHaveLength(2)
    const rect = elemento('mesa-reuniones', 0, 0, 0)
    expect(huellasEnPlanta(def('mesa-reuniones'), rect)).toHaveLength(1)
    expect(def('mesa-reuniones').volumenes(rect)).toHaveLength(5)
  })

  it('papelera redonda en el plano', () => {
    const [huella] = huellasEnPlanta(def('papelera'), elemento('papelera', 0, 0, 0))
    expect(contienePunto(huella!, { x: 0, y: 0 })).toBe(true)
    expect(contienePunto(huella!, { x: 14, y: 14 })).toBe(false)
  })
})
