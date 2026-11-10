import { describe, expect, it } from 'vitest'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { lampara } from './lampara'
import { elemento } from './ayuda.test-util'

type Revolucion = Extract<PiezaLocal, { forma: 'revolucion' }>
const piezas = (ancho = 40, alto = 160) => lampara.modelo3d!(elemento('lampara-pie', 0, 0, 0, { ancho, fondo: ancho, alto }))
const revoluciones = (zona: string, ps = piezas()) => ps.filter((p): p is Revolucion => p.forma === 'revolucion' && p.zona === zona)

describe('lámpara de pie en 3D', () => {
  it('la pantalla es un tronco de cono hueco: abajo medio lado, arriba más estrecha, con grosor y abierta por los dos lados', () => {
    const [pantalla] = revoluciones('pantalla')
    expect(pantalla).toBeDefined()
    const { perfil } = pantalla!
    const radios = perfil.map(([r]) => r)
    const zs = perfil.map(([, z]) => z)
    expect(Math.max(...radios)).toBeCloseTo(20)
    expect([Math.min(...zs), Math.max(...zs)]).toEqual([130, 160])
    // Arriba (z = 160) el radio exterior es menor que abajo.
    const exterior = (z: number) => Math.max(...perfil.filter(([, pz]) => pz === z).map(([r]) => r))
    expect(exterior(160)).toBeLessThan(exterior(130))
    // Hueca: ningún punto en el eje, y el perfil se cierra (vuelve al primero) para que la pared tenga dos caras.
    expect(Math.min(...radios)).toBeGreaterThan(0)
    expect(perfil.at(-1)).toEqual(perfil[0])
  })

  it('el pie es una peana de revolución con el canto achaflanado, del suelo a 3 cm, y la caña sube de ella a la pantalla', () => {
    const [peana] = revoluciones('pie')
    expect(peana).toBeDefined()
    const zs = peana!.perfil.map(([, z]) => z)
    expect([Math.min(...zs), Math.max(...zs)]).toEqual([0, 3])
    // Arriba es más estrecha que abajo: el chaflán.
    const arriba = Math.max(...peana!.perfil.filter(([, z]) => z === 3).map(([r]) => r))
    expect(arriba).toBeLessThan(40 * 0.35)
    // La pantalla es hueca y desde arriba se ve por dentro: la caña sube hasta arriba y una cruceta la sujeta.
    const cana = piezas().find((p) => p.forma === 'cilindro' && p.zona === 'pie')
    expect(cana).toMatchObject({ z0: 3, z1: 159 })
  })

  it('una cruceta de dos tubos une la caña con el borde de arriba de la pantalla', () => {
    const ps = piezas()
    const [pantalla] = revoluciones('pantalla', ps)
    const radioInteriorArriba = Math.min(...pantalla!.perfil.filter(([, z]) => z === 160).map(([r]) => r))
    const tubos = ps.filter((p): p is Extract<PiezaLocal, { forma: 'tubo' }> => p.forma === 'tubo' && p.zona === 'pie')
    expect(tubos).toHaveLength(2)
    for (const t of tubos) {
      const largo = Math.hypot(t.puntos[1]![0] - t.puntos[0]![0], t.puntos[1]![1] - t.puntos[0]![1])
      expect(largo).toBeCloseTo(2 * radioInteriorArriba)
      expect(t.puntos.every(([, , z]) => z === 159)).toBe(true)
    }
  })

  it('con la lámpara más estrecha (25), la pantalla sigue cabiendo en la huella', () => {
    const [pantalla] = revoluciones('pantalla', piezas(25, 120))
    expect(Math.max(...pantalla!.perfil.map(([r]) => r))).toBeCloseTo(12.5)
  })
})
