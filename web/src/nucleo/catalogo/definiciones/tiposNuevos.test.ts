import { describe, expect, it } from 'vitest'
import { cajaPlanta } from '../../geometria/poligono'
import { catalogoBase } from '../catalogoBase'
import { sePuedeVoltear } from '../elemento'
import { elemento } from './ayuda.test-util'

const def = (id: string) => {
  const d = catalogoBase.get(id)
  if (!d) throw new Error(`falta el tipo ${id}`)
  return d
}
/** Fondo en planta (y del mundo, sin girar) de todos los volúmenes juntos. */
const fondoEnPlanta = (id: string, variantes = {}) => {
  const c = cajaPlanta(def(id).volumenes(elemento(id, 0, 0, 0, {}, variantes)).flatMap((v) => v.huella))
  return { desde: c.minY, hasta: c.maxY }
}

describe('tipos que faltaban (M-16)', () => {
  it('cuna, litera, sofá cama, zapatero, perchero y mesa plegable están, cada uno en sus estancias', () => {
    expect(def('cuna').estancias).toEqual(['dormitorio'])
    expect(def('litera').estancias).toEqual(['dormitorio'])
    expect(def('sofa-cama').estancias).toEqual(['salon', 'despacho', 'dormitorio'])
    expect(def('zapatero').estancias).toEqual(['dormitorio', 'salon'])
    expect(def('perchero').estancias).toEqual(['dormitorio', 'salon', 'despacho'])
    expect(def('mesa-plegable').estancias).toEqual(['cocina', 'salon', 'despacho'])
    for (const id of ['cuna', 'litera', 'sofa-cama', 'zapatero', 'perchero', 'mesa-plegable']) expect(def(id).categoria).toBe('mueble')
  })

  it('nombres y género para los textos («la cuna», «el sofá cama»)', () => {
    expect([def('cuna').nombre, def('cuna').genero]).toEqual(['cuna', 'f'])
    expect([def('litera').nombre, def('litera').genero]).toEqual(['litera', 'f'])
    expect([def('sofa-cama').nombre, def('sofa-cama').genero]).toEqual(['sofá cama', 'm'])
    expect([def('zapatero').nombre, def('zapatero').genero]).toEqual(['zapatero', 'm'])
    expect([def('perchero').nombre, def('perchero').genero]).toEqual(['perchero', 'm'])
    expect([def('mesa-plegable').nombre, def('mesa-plegable').genero]).toEqual(['mesa plegable', 'f'])
  })

  it('litera: la escalera va a un lado y se voltea', () => {
    expect(def('litera').variantes.find((v) => v.clave === 'escalera')?.valores).toEqual(['izquierda', 'derecha'])
    expect(sePuedeVoltear(def('litera'))).toBe(true)
    expect(def('litera').medidas.alto.defecto).toBeGreaterThanOrEqual(150)
  })

  it('sofá cama: cerrado ocupa su fondo; abierto, la cama sale 110 cm por delante y baja (45 cm)', () => {
    const fondo = def('sofa-cama').medidas.fondo.defecto
    expect(fondoEnPlanta('sofa-cama', { abierto: false })).toEqual({ desde: -fondo / 2, hasta: fondo / 2 })
    expect(fondoEnPlanta('sofa-cama', { abierto: true })).toEqual({ desde: -fondo / 2, hasta: fondo / 2 + 110 })
    const cama = def('sofa-cama').volumenes(elemento('sofa-cama', 0, 0, 0, {}, { abierto: true })).find((v) => cajaPlanta(v.huella).maxY > fondo / 2)!
    expect(cama.zMax).toBeLessThanOrEqual(45)
    expect(def('sofa-cama').conjunto).toBe('estar')
  })

  it('mesa plegable: abierta es un tablero que deja libre el suelo; cerrada, 6 cm pegados a la pared', () => {
    const d = def('mesa-plegable')
    const { fondo, alto } = d.medidas
    const abierta = d.volumenes(elemento('mesa-plegable', 0, 0, 0, {}, { abierta: true }))
    expect(fondoEnPlanta('mesa-plegable', { abierta: true })).toEqual({ desde: -fondo.defecto / 2, hasta: fondo.defecto / 2 })
    // Lo que va hasta delante es solo el tablero: debajo cabe una silla.
    const hastaDelante = abierta.filter((v) => cajaPlanta(v.huella).maxY >= fondo.defecto / 2 - 1)
    expect(hastaDelante.every((v) => v.zMin >= alto.defecto - 3)).toBe(true)
    expect(fondoEnPlanta('mesa-plegable', { abierta: false })).toEqual({ desde: -fondo.defecto / 2, hasta: -fondo.defecto / 2 + 6 })
  })

  it('zapatero: trampillas que se abren hacia delante; perchero: no corta el paso', () => {
    expect(def('zapatero').zonasApertura(elemento('zapatero', 0, 0, 0)).length).toBeGreaterThan(0)
    expect(def('perchero').bloqueaPaso).toBe(false)
    expect(def('cuna').bloqueaPaso).toBe(true)
    expect(def('litera').bloqueaPaso).toBe(true)
  })
})
