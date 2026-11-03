import type { Elemento, TipoEstancia } from '../modelo/documento'
import type { Prisma } from '../geometria/prisma'
import type { Punto } from '../geometria/vector'
import type { PiezaLocal } from '../modelo3d/tipos'

export interface Rango { min: number; max: number; defecto: number }
export interface DefinicionVariante {
  clave: string
  etiqueta: string
  valores: (string | number | boolean)[]
  defecto: string | number | boolean
  /** Valores que admite este elemento cuando dependen de él (dos senos solo con 1 m de ancho); sin ella, todos. */
  valoresPara?: (e: Elemento) => (string | number | boolean)[]
}
export interface DefinicionMedidaExtra {
  clave: string
  etiqueta: string
  rango: Rango
  /** El rango que admite este elemento cuando depende de sus otras medidas (el hueco, del ancho del ala); sin ella, `rango`. */
  rangoPara?: (e: Elemento) => Rango
  /** El valor de un elemento guardado antes de que existiera la medida (sacado de lo que tenía entonces), si lo hay. */
  legado?: (e: Elemento) => number | undefined
}
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
  /** Alto de verdad cuando no es el de las medidas (el inodoro con la cisterna empotrada: la taza); entonces el alto no se edita. */
  altoReal?: (e: Elemento) => number | undefined
  /** El panel deja cambiar la altura desde el suelo, entre 0 y `estancia.alto − alto`. */
  alturaSueloEditable: boolean
  variantes: DefinicionVariante[]
  /** Medidas propias del tipo además de ancho, fondo y alto, con su rango: se editan como ellas. */
  medidasExtra?: DefinicionMedidaExtra[]
  /** Las líneas de la hoja para las medidas extra; sin ella, «Etiqueta: N cm» por cada una. */
  detallesExtra?: (e: Elemento) => string[]
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

function variante(def: DefinicionTipo, clave: string): DefinicionVariante {
  const d = def.variantes.find((x) => x.clave === clave)
  if (!d) throw new Error(`variante desconocida: ${clave}`)
  return d
}

function medidaExtra(def: DefinicionTipo, clave: string): DefinicionMedidaExtra {
  const d = def.medidasExtra?.find((m) => m.clave === clave)
  if (!d) throw new Error(`medida extra desconocida: ${clave}`)
  return d
}

/** El rango que admite el elemento para una medida extra: puede depender de sus otras medidas. */
export function rangoMedidaExtra(def: DefinicionTipo, e: Elemento, clave: string): Rango {
  const d = medidaExtra(def, clave)
  return d.rangoPara?.(e) ?? d.rango
}

/**
 * Valor de una medida extra del elemento, recortado al rango que admite; si no la tiene, la de antes (legado) o su
 * defecto. Lo que dice el campo es lo que se dibuja: el recorte por las otras medidas ya va aquí.
 */
export function valorMedidaExtra(def: DefinicionTipo, e: Elemento, clave: string): number {
  const d = medidaExtra(def, clave)
  const { min, max } = rangoMedidaExtra(def, e, clave)
  const v = e.medidasExtra?.[clave] ?? d.legado?.(e) ?? d.rango.defecto
  return Math.min(max, Math.max(min, Math.round(v)))
}

/** Las líneas de la hoja y de la ficha para las medidas extra: las del tipo si las da; si no, «Etiqueta: N cm». */
export function lineasMedidasExtra(def: DefinicionTipo, e: Elemento): string[] {
  return def.detallesExtra?.(e) ?? (def.medidasExtra ?? []).map((m) => `${m.etiqueta}: ${valorMedidaExtra(def, e, m.clave)} cm`)
}

/** Todas las medidas extra del tipo con su valor (vacío si el tipo no tiene). */
export function medidasExtraDe(def: DefinicionTipo, e: Elemento): Record<string, number> {
  return Object.fromEntries((def.medidasExtra ?? []).map((m) => [m.clave, valorMedidaExtra(def, e, m.clave)]))
}

/** Valores de una variante que admite el elemento. */
export function valoresVariante(def: DefinicionTipo, e: Elemento, clave: string): (string | number | boolean)[] {
  const d = variante(def, clave)
  return d.valoresPara?.(e) ?? d.valores
}

/** Valor de una variante del elemento; si falta o el elemento no lo admite, su defecto (o, si tampoco lo admite, el primero que sí). */
export function valorVariante(def: DefinicionTipo, e: Elemento, clave: string): string | number | boolean {
  const d = variante(def, clave)
  const validos = valoresVariante(def, e, clave)
  const v = e.variantes[clave]
  if (v !== undefined && validos.includes(v)) return v
  return validos.includes(d.defecto) ? d.defecto : validos[0]!
}
