import { describe, expect, it } from 'vitest'
import { catalogoBase } from '../catalogoBase'
import { huellasEnPlanta, nombreEnPlanta } from '../elemento'
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

  it('escritorio en L: dos tableros y cinco patas; en el plano, una sola L de seis vértices, sin línea entre los tableros', () => {
    expect(def('escritorio-l').volumenes(elemento('escritorio-l', 0, 0, 0))).toHaveLength(7)
    // 160×140: tablero principal de y −70 a −10; ala de 60 de ancho hasta y 70.
    const derecha = huellasEnPlanta(def('escritorio-l'), elemento('escritorio-l', 0, 0, 0))
    expect(derecha).toHaveLength(1)
    expect(derecha[0]).toHaveLength(6)
    for (const p of [{ x: -60, y: -40 }, { x: 60, y: -40 }, { x: 50, y: 50 }]) expect(contienePunto(derecha[0]!, p)).toBe(true)
    expect(contienePunto(derecha[0]!, { x: -60, y: 50 })).toBe(false)
    const [izquierda] = huellasEnPlanta(def('escritorio-l'), elemento('escritorio-l', 0, 0, 0, {}, { ala: 'izquierda' }))
    expect(contienePunto(izquierda!, { x: -50, y: 50 })).toBe(true)
    expect(contienePunto(izquierda!, { x: 60, y: 50 })).toBe(false)
  })

  it('escritorio en L: el nombre va en el tablero principal, no en la esquina vacía', () => {
    expect(nombreEnPlanta(def('escritorio-l'), elemento('escritorio-l', 100, 100, 0))).toEqual({ x: 100, y: 60 })
    const girado = nombreEnPlanta(def('escritorio-l'), elemento('escritorio-l', 100, 100, 90))
    expect(girado.x).toBeCloseTo(140, 9)
    expect(girado.y).toBeCloseTo(100, 9)
    expect(nombreEnPlanta(def('escritorio'), elemento('escritorio', 100, 100, 0))).toEqual({ x: 100, y: 100 })
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

  it('lo que está bajo un escritorio no da avisos de paso estrecho: por ahí no se pasa', () => {
    // Escritorio 160×80 contra la pared de arriba (y de 0 a 80); cajonera y archivador bajo el tablero, a 30 cm entre sí y a 25 y 18 cm de la pared.
    const doc = documentoNuevo('despacho', 400, 400, 250)
    doc.elementos = [
      elemento('escritorio', 200, 40, 0, { ancho: 160, fondo: 80 }, {}, 'mesa'),
      elemento('cajonera', 150, 52.5, 0, {}, {}, 'caj'),
      elemento('archivador', 224.5, 49, 0, { alto: 70 }, {}, 'arc'),
    ]
    expect(detectarConflictos(doc, catalogoBase).filter((c) => c.tipo === 'pasoEstrecho')).toEqual([])
  })

  it('una cajonera fuera de la mesa sí avisa del paso estrecho', () => {
    const doc = documentoNuevo('despacho', 400, 400, 250)
    doc.elementos = [elemento('cajonera', 200, 57.5, 0, {}, {}, 'caj')]
    expect(detectarConflictos(doc, catalogoBase).some((c) => c.tipo === 'pasoEstrecho' && c.ids.includes('caj'))).toBe(true)
  })
})
