import type { Elemento, TipoEstancia } from '../modelo/documento'
import type { Prisma } from '../geometria/prisma'

export interface Rango { min: number; max: number; defecto: number }
export interface DefinicionVariante { clave: string; etiqueta: string; valores: (string | number | boolean)[]; defecto: string | number | boolean }
export interface ZonaColor { clave: string; etiqueta: string; material: 'tela' | 'madera' | 'lacado' | 'metal' | 'vidrio' | 'ceramica'; defecto: string }
export interface ZonaApertura extends Prisma { nombre: string }

export interface DefinicionTipo {
  id: string
  nombre: string
  genero: 'm' | 'f'
  estancias: TipoEstancia[]
  medidas: { ancho: Rango; fondo: Rango; alto: Rango }
  alturaSuelo: number
  variantes: DefinicionVariante[]
  zonasColor: ZonaColor[]
  /** Alfombra: no choca con muebles. */
  pisable: boolean
  /** Cuenta para el paso estrecho. */
  bloqueaPaso: boolean
  /** Cortina: no "tapa" ventanas. */
  sobreVentana: boolean
  /** Volúmenes en coordenadas del mundo. */
  volumenes(e: Elemento): Prisma[]
  zonasApertura(e: Elemento): ZonaApertura[]
}
export type Catalogo = ReadonlyMap<string, DefinicionTipo>

/** 'el armario', 'la cama'. */
export function conArticulo(nombre: string, genero: 'm' | 'f'): string {
  return `${genero === 'm' ? 'el' : 'la'} ${nombre}`
}

/** 'del armario', 'de la cómoda'. */
export function deArticulo(nombre: string, genero: 'm' | 'f'): string {
  return genero === 'm' ? `del ${nombre}` : `de la ${nombre}`
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Valor de una variante del elemento; si falta, el defecto de la definición. */
export function valorVariante(def: DefinicionTipo, e: Elemento, clave: string): string | number | boolean {
  const v = e.variantes[clave]
  if (v !== undefined) return v
  const d = def.variantes.find((x) => x.clave === clave)
  if (!d) throw new Error(`variante desconocida: ${clave}`)
  return d.defecto
}
