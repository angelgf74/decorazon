import { describe, expect, it } from 'vitest'
import { catalogoBase } from '../catalogoBase'
import { huellasEnPlanta } from '../elemento'
import { documentoNuevo } from '../../modelo/crear'
import { detectarConflictos } from '../../conflictos/detectar'
import type { Elemento, TipoEstancia } from '../../modelo/documento'
import { elemento } from './ayuda.test-util'

const def = (id: string) => {
  const d = catalogoBase.get(id)
  if (!d) throw new Error(id)
  return d
}

function en(tipo: TipoEstancia, ancho: number, largo: number, ...elementos: Elemento[]) {
  const doc = documentoNuevo(tipo, ancho, largo, 250)
  doc.elementos = elementos
  return detectarConflictos(doc, catalogoBase)
}

describe('salón y cocina: piezas nuevas', () => {
  it('cada pieza nueva es de su estancia', () => {
    for (const id of ['sofa-rinconera', 'vitrina', 'libreria', 'mesa-auxiliar', 'puf', 'chimenea']) expect(def(id).estancias).toContain('salon')
    for (const id of ['isla', 'mesa-alta', 'campana']) expect(def(id).estancias).toContain('cocina')
  })

  it('sofá rinconera: en el plano, una sola L de seis vértices con el rincón en el lado elegido', () => {
    const izquierda = huellasEnPlanta(def('sofa-rinconera'), elemento('sofa-rinconera', 0, 0, 0))
    expect(izquierda).toHaveLength(1)
    expect(izquierda[0]).toHaveLength(6)
    // Ancho 260 y fondo 200: el ala baja hasta y = 100 por el lado del rincón.
    const abajo = (h: { x: number; y: number }[]) => h.filter((p) => Math.abs(p.y - 100) < 1e-9).map((p) => p.x)
    expect(Math.max(...abajo(izquierda[0]!))).toBeLessThan(0)
    const derecha = huellasEnPlanta(def('sofa-rinconera'), elemento('sofa-rinconera', 0, 0, 0, {}, { rincon: 'derecha' }))
    expect(Math.min(...abajo(derecha[0]!))).toBeGreaterThan(0)
  })

  it('sofá rinconera en el rincón de un salón: sin avisos', () => {
    // 260×200 con el ala a la izquierda, pegado a las paredes x = 0 e y = 0.
    expect(en('salon', 500, 400, elemento('sofa-rinconera', 130, 100, 0))).toEqual([])
  })

  it('vitrina: una puerta de cristal hasta 60 cm de ancho, dos por encima', () => {
    expect(def('vitrina').zonasApertura(elemento('vitrina', 0, 0, 0, { ancho: 60 }))).toHaveLength(1)
    expect(def('vitrina').zonasApertura(elemento('vitrina', 0, 0, 0, { ancho: 100 }))).toHaveLength(2)
  })

  it('chimenea de leña con el sofá a 60 cm: la zona de seguridad avisa de que faltan 20 cm; la eléctrica, no', () => {
    // Chimenea de fondo 40 contra la pared y = 0; sofá girado 180° con su espalda en y = 100.
    const sofa = elemento('sofa', 250, 145, 180, {}, {}, 's')
    const conLena = en('salon', 500, 400, elemento('chimenea', 250, 20, 0, {}, {}, 'c'), sofa)
    expect(conLena).toEqual([expect.objectContaining({ gravedad: 'aviso', ids: ['c', 's'], mensaje: 'La zona de seguridad de la chimenea choca con el sofá: faltan 20 cm' })])
    expect(en('salon', 500, 400, elemento('chimenea', 250, 20, 0, {}, { tipo: 'eléctrica' }), sofa)).toEqual([])
  })

  it('isla con barra: los taburetes caben bajo el voladizo sin avisos', () => {
    // Isla 180×90 en (200, 200): voladizo de 35 cm por detrás (y de 155 a 190).
    expect(en('cocina', 400, 400, elemento('isla', 200, 200, 0), elemento('taburete', 170, 172.5, 0), elemento('taburete', 230, 172.5, 0))).toEqual([])
  })

  it('isla con la pared a 75 cm: el paso alrededor avisa de que faltan 15 cm', () => {
    // La isla llega a y = 245 y la pared está en y = 320.
    expect(en('cocina', 400, 320, elemento('isla', 200, 200, 0, {}, {}, 'i'))).toEqual([
      expect.objectContaining({ gravedad: 'aviso', ids: ['i'], mensaje: 'El paso alrededor de la isla choca con la pared: faltan 15 cm' }),
    ])
  })

  it('campana sobre la placa de un módulo bajo: sin avisos', () => {
    expect(en('cocina', 400, 400,
      elemento('modulo-bajo', 200, 30, 0),
      elemento('placa', 200, 30, 0),
      elemento('campana', 200, 25, 0),
    )).toEqual([])
  })

  it('columna con horno y microondas: la puerta del horno abate hacia abajo y la del microondas, de lado', () => {
    const zonas = def('columna-cocina').zonasApertura(elemento('columna-cocina', 0, 0, 0, {}, { integrado: 'horno y microondas' }))
    expect(zonas.map((z) => z.nombre)).toEqual(['la puerta', 'la puerta del microondas'])
    expect(zonas[1]!.zMin).toBeGreaterThanOrEqual(145)
  })
})
