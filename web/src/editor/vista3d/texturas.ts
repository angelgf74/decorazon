import { DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping, RGBAFormat } from 'three'
import type { MaterialPBR } from '../../nucleo'

/**
 * Texturas de los materiales (M-12), generadas en el navegador: no pesan ni un fichero. Cada patrón es una luminancia
 * casi blanca que multiplica el color elegido (`map × color`), así que el color sigue siendo el del usuario.
 * Va en lineal (sin sRGB): en sRGB el 0,92 de la media pasaría a 0,83 y oscurecería todos los colores.
 */
export type PatronTextura = 'madera' | 'tela' | 'suelo' | 'pared'

export const LADO_TEXTURA = 256

/** Cuántos metros cubre una repetición: las coordenadas de textura van en metros (`uvsEnMetros`). */
export const METROS_POR_MOSAICO: Record<PatronTextura, number> = { madera: 0.6, tela: 0.2, suelo: 1.6, pared: 1.5 }

const N = LADO_TEXTURA

function azar(i: number, j: number, semilla: number): number {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(semilla, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const suave = (t: number) => t * t * (3 - 2 * t)

/** Ruido de valor periódico: `gx` × `gy` celdas en la textura, y el borde enlaza con el principio (sin costura). */
function ruido(x: number, y: number, gx: number, gy: number, semilla: number): number {
  const fx = (x / N) * gx
  const fy = (y / N) * gy
  const i = Math.floor(fx)
  const j = Math.floor(fy)
  const tx = suave(fx - i)
  const ty = suave(fy - j)
  const v = (a: number, b: number) => azar(((a % gx) + gx) % gx, ((b % gy) + gy) % gy, semilla)
  const arriba = v(i, j) + (v(i + 1, j) - v(i, j)) * tx
  const abajo = v(i, j + 1) + (v(i + 1, j + 1) - v(i, j + 1)) * tx
  return arriba + (abajo - arriba) * ty
}

/** Suma de octavas en [0, 1). */
function fbm(x: number, y: number, gx: number, gy: number, semilla: number): number {
  let s = 0
  let peso = 0.5
  let total = 0
  for (let o = 0; o < 4; o++) {
    s += peso * ruido(x, y, gx << o, gy << o, semilla + o)
    total += peso
    peso /= 2
  }
  return s / total
}

/** Veta a lo largo de u: líneas que ondulan, más un poco de fibra. */
function veta(x: number, y: number, semilla: number, fuerza: number): number {
  const onda = Math.sin(2 * Math.PI * ((y / N) * 7 + fbm(x, y, 2, 4, semilla) * 1.6))
  const fibra = ruido(x, y, 8, 128, semilla + 9) - 0.5
  return fuerza * (0.6 * onda + 0.8 * fibra)
}

function luminancia(tipo: PatronTextura, x: number, y: number): number {
  switch (tipo) {
    case 'madera':
      return 0.92 + veta(x, y, 1, 0.06)
    case 'tela': {
      // Tafetán: hilos de 4 px que se cruzan, y algo de irregularidad.
      const cruce = (Math.floor(x / 4) + Math.floor(y / 4)) % 2
      return 0.9 + 0.05 * cruce + 0.06 * (ruido(x, y, 64, 64, 3) - 0.5)
    }
    case 'suelo': {
      // Tarima: 8 tablas por mosaico, cada una con su tono y una junta a una altura distinta.
      const alto = N / 8
      const fila = Math.floor(y / alto)
      const desde = Math.floor(azar(fila, 0, 5) * N)
      const enTabla = (x + desde) % N
      if (y % alto === 0 || enTabla === 0) return 0.76
      return 0.88 + 0.08 * azar(fila, 1, 5) + veta(x, y, 7, 0.03)
    }
    case 'pared':
      // Pintura sobre yeso: una variación suave, casi imperceptible de lejos.
      return 0.95 + 0.06 * (fbm(x, y, 8, 8, 11) - 0.5)
  }
}

const patrones = new Map<PatronTextura, Float32Array>()

/** Luminancia de cada píxel, fila a fila, entre 0 y 1. */
export function patronDe(tipo: PatronTextura): Float32Array {
  const hecho = patrones.get(tipo)
  if (hecho !== undefined) return hecho.slice()
  const p = new Float32Array(N * N)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) p[y * N + x] = Math.min(1, luminancia(tipo, x, y))
  patrones.set(tipo, p)
  return p.slice()
}

const CON_TEXTURA: Partial<Record<MaterialPBR, PatronTextura>> = { madera: 'madera', tela: 'tela', suelo: 'suelo', pared: 'pared' }

const texturas = new Map<PatronTextura, DataTexture>()

/** La textura compartida de un material, o null si va liso (lacado, metal, cerámica, cristales). */
export function texturaDe(material: MaterialPBR): DataTexture | null {
  const tipo = CON_TEXTURA[material]
  if (tipo === undefined) return null
  const hecha = texturas.get(tipo)
  if (hecha !== undefined) return hecha
  const p = patronDe(tipo)
  const datos = new Uint8Array(N * N * 4)
  p.forEach((l, k) => {
    const v = Math.round(l * 255)
    datos.set([v, v, v, 255], k * 4)
  })
  const t = new DataTexture(datos, N, N, RGBAFormat)
  t.colorSpace = NoColorSpace
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(1 / METROS_POR_MOSAICO[tipo], 1 / METROS_POR_MOSAICO[tipo])
  t.magFilter = LinearFilter
  t.minFilter = LinearMipmapLinearFilter
  t.generateMipmaps = true
  // El suelo se ve muy de lado: sin filtrado anisótropo la tarima se emborrona a dos metros. WebGL lo recorta a lo que admita la GPU.
  t.anisotropy = 4
  t.needsUpdate = true
  texturas.set(tipo, t)
  return t
}
