import { describe, expect, it } from 'vitest'
import { contornear } from './contorno'

const TINTA: [number, number, number] = [0x2b, 0x26, 0x22]
const OPCIONES = { px: 2, color: TINTA, opacidad: 0.45 }

/** Una imagen RGBA transparente de ancho × alto con los píxeles dados. */
function imagen(ancho: number, alto: number, pixeles: { x: number; y: number; rgba: [number, number, number, number] }[]) {
  const datos = new Uint8Array(ancho * alto * 4)
  for (const { x, y, rgba } of pixeles) datos.set(rgba, (y * ancho + x) * 4)
  return datos
}

const pixel = (r: { datos: Uint8Array; ancho: number }, x: number, y: number) => {
  const i = (y * r.ancho + x) * 4
  return [...r.datos.slice(i, i + 4)]
}

describe('contornear', () => {
  it('ensancha la imagen px por cada lado para que el contorno no quede cortado', () => {
    const r = contornear(imagen(3, 2, []), 3, 2, OPCIONES)

    expect([r.ancho, r.alto]).toEqual([7, 6])
    expect(r.datos.length).toBe(7 * 6 * 4)
  })

  it('pinta el contorno en tinta hasta px de distancia y en redondo, y deja el mueble como estaba', () => {
    const blanco: [number, number, number, number] = [240, 240, 240, 255]
    const r = contornear(imagen(1, 1, [{ x: 0, y: 0, rgba: blanco }]), 1, 1, OPCIONES)
    const alfa = Math.round(255 * 0.45)

    expect(pixel(r, 2, 2)).toEqual(blanco)
    expect(pixel(r, 0, 2)).toEqual([...TINTA, alfa]) // a 2 px
    expect(pixel(r, 1, 1)).toEqual([...TINTA, alfa]) // en diagonal, a 1,4 px
    expect(pixel(r, 0, 0)[3]).toBe(0) // la esquina está a 2,8 px: fuera del redondo
  })

  it('el contorno es tan opaco como lo más opaco que tiene cerca (bordes suavizados y cristal)', () => {
    const r = contornear(imagen(1, 1, [{ x: 0, y: 0, rgba: [255, 255, 255, 100] }]), 1, 1, OPCIONES)

    expect(pixel(r, 0, 2)).toEqual([...TINTA, Math.round(100 * 0.45)])
  })

  it('un píxel a medias se compone encima del contorno, no lo sustituye', () => {
    const r = contornear(imagen(1, 1, [{ x: 0, y: 0, rgba: [255, 255, 255, 128] }]), 1, 1, OPCIONES)
    const [rr, , , a] = pixel(r, 2, 2)

    // Encima: alfa 0,5 sobre el contorno (128 × 0,45 ≈ 0,23) da 0,61; el color, entre blanco y tinta, más cerca del blanco.
    expect(a).toBe(Math.round(255 * (128 / 255 + (Math.round(128 * 0.45) / 255) * (1 - 128 / 255))))
    expect(rr).toBeGreaterThan(200)
    expect(rr).toBeLessThan(255)
  })

  it('una imagen transparente sigue transparente', () => {
    const r = contornear(imagen(4, 4, []), 4, 4, OPCIONES)

    expect(r.datos.every((v, i) => i % 4 !== 3 || v === 0)).toBe(true)
  })
})
