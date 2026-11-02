import type { Elemento, TipoEstancia } from '../modelo/documento'
import type { Prisma } from '../geometria/prisma'
import type { Punto } from '../geometria/vector'
import type { PiezaLocal } from '../modelo3d/tipos'

export interface Rango { min: number; max: number; defecto: number }
export interface DefinicionVariante { clave: string; etiqueta: string; valores: (string | number | boolean)[]; defecto: string | number | boolean }
export interface ZonaColor { clave: string; etiqueta: string; material: 'tela' | 'madera' | 'lacado' | 'metal' | 'vidrio' | 'ceramica'; defecto: string }
export interface ZonaApertura extends Prisma {
  nombre: string
  /**
   * Espacio libre del suelo: lo que falta se mide solo en planta, porque una pieza baja (un plato de ducha) estorba igual que una alta,
   * y es un aviso, no un error: en los baños pequeños es habitual tener algo menos.
   */
  espacioLibre?: boolean
}

export interface DefinicionTipo {
  id: string
  nombre: string
  genero: 'm' | 'f'
  categoria: 'mueble' | 'decoracion'
  estancias: TipoEstancia[]
  medidas: { ancho: Rango; fondo: Rango; alto: Rango }
  alturaSuelo: number
  /** El panel deja cambiar la altura desde el suelo, entre 0 y `estancia.alto − alto`. */
  alturaSueloEditable: boolean
  variantes: DefinicionVariante[]
  zonasColor: ZonaColor[]
  /** No choca con muebles ni con aperturas (alfombra, cortina). */
  pisable: boolean
  /** Cuenta para el paso estrecho. */
  bloqueaPaso: boolean
  /** Cortina: no "tapa" ventanas. */
  sobreVentana: boolean
  /** Volúmenes en coordenadas del mundo. */
  volumenes(e: Elemento): Prisma[]
  /** Huellas que pinta el plano, en coordenadas del mundo; sin ella, las de los volúmenes. */
  planta?: (e: Elemento) => Punto[][]
  /** Dónde se escribe el nombre en el plano, en coordenadas del mundo; sin ella, en `e.posicion`. */
  posicionNombre?: (e: Elemento) => Punto
  zonasApertura(e: Elemento): ZonaApertura[]
  /** Piezas 3D en el sistema local del elemento; sin ella se usa una caja del tamaño del elemento. */
  modelo3d?: (e: Elemento) => PiezaLocal[]
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

/** Valor de una variante del elemento; si falta o no es uno de los valores de la definición, su defecto. */
export function valorVariante(def: DefinicionTipo, e: Elemento, clave: string): string | number | boolean {
  const d = def.variantes.find((x) => x.clave === clave)
  if (!d) throw new Error(`variante desconocida: ${clave}`)
  const v = e.variantes[clave]
  return v !== undefined && d.valores.includes(v) ? v : d.defecto
}
