import { describe, expect, it } from 'vitest'
import { elipse, elipsoide, onda, rectanguloRedondeado } from './perfiles'

const caja = (ps: [number, number][]) => {
  const xs = ps.map(([x]) => x)
  const ys = ps.map(([, y]) => y)
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map((v) => Number(v.toFixed(9)))
}

describe('contornos y perfiles para las formas 3D', () => {
  it('elipse: n puntos sobre la elipse, con los extremos de los ejes (n múltiplo de 4)', () => {
    const ps = elipse(5, -2, 10, 4, 24)
    expect(ps).toHaveLength(24)
    for (const [x, y] of ps) expect(((x - 5) / 10) ** 2 + ((y + 2) / 4) ** 2).toBeCloseTo(1)
    expect(caja(ps)).toEqual([-5, -6, 15, 2])
  })

  it('rectanguloRedondeado: la caja de siempre con las esquinas en arco de radio r (ninguna esquina viva)', () => {
    const ps = rectanguloRedondeado(-20, -10, 20, 10, 4, 4)
    expect(caja(ps)).toEqual([-20, -10, 20, 10])
    expect(ps.some(([x, y]) => Math.abs(Math.abs(x) - 20) < 1e-9 && Math.abs(Math.abs(y) - 10) < 1e-9)).toBe(false)
    // Cada punto de una esquina dista r de su centro.
    const esquina = ps.filter(([x, y]) => x > 16 && y > 6)
    for (const [x, y] of esquina) expect(Math.hypot(x - 16, y - 6)).toBeCloseTo(4)
  })

  it('rectanguloRedondeado: el radio no pasa de medio lado menor', () => {
    expect(caja(rectanguloRedondeado(0, 0, 10, 4, 9))).toEqual([0, 0, 10, 4])
  })

  it('elipsoide: perfil de revolución que va del eje abajo al eje arriba pasando por el radio a media altura (antihorario)', () => {
    const p = elipsoide(8, 10, 40, 8)
    expect(p[0]).toEqual([0, 10])
    expect(p.at(-1)![0]).toBeCloseTo(0)
    expect(p.at(-1)![1]).toBeCloseTo(40)
    expect(Math.max(...p.map(([r]) => r))).toBeCloseTo(8)
    // Antihorario con el radio a la derecha: z siempre sube.
    for (let i = 1; i < p.length; i++) expect(p[i]![1]).toBeGreaterThan(p[i - 1]![1])
  })

  it('onda: tela plegada de x0 a x1, cerrada, con su grueso, sin pasar de amplitud + medio grueso', () => {
    const ps = onda(-40, 0, 0, 3, 4, 1)
    expect(caja(ps)).toEqual([-40, -3.5, 0, 3.5])
    // Ida por una cara y vuelta por la otra: el contorno no se cruza consigo mismo si el grueso es menor que la amplitud.
    expect(ps[0]![0]).toBeCloseTo(-40)
    expect(ps.at(-1)![0]).toBeCloseTo(-40)
  })
})
