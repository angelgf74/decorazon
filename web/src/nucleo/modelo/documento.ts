export const FORMATO_ACTUAL = 1
export type TipoEstancia = 'dormitorio' | 'salon' | 'cocina' | 'despacho' | 'bano'
export const TIPOS_ESTANCIA: readonly TipoEstancia[] = ['dormitorio', 'salon', 'cocina', 'despacho', 'bano']
import type { Punto } from '../geometria/vector'
export type { Punto }
export interface Estancia { tipo: TipoEstancia; alto: number; grosorPared: number; planta: Punto[]; colorParedes: string; colorSuelo: string }
export interface Puerta { id: string; tipo: 'puerta'; pared: number; posicion: number; ancho: number; alto: number; hoja: 'abatible' | 'corredera'; bisagra: 'izquierda' | 'derecha'; abreHacia: 'dentro' | 'fuera' }
export interface Ventana { id: string; tipo: 'ventana'; pared: number; posicion: number; ancho: number; alto: number; alturaSuelo: number; abreHaciaDentro: boolean }
export type Abertura = Puerta | Ventana
export interface Columna { id: string; tipo: 'columna'; centro: Punto; ancho: number; fondo: number; rotacion: number }
export interface Viga { id: string; tipo: 'viga'; desde: Punto; hasta: Punto; ancho: number; canto: number }
export interface Radiador { id: string; tipo: 'radiador'; pared: number; posicion: number; ancho: number; alto: number; fondo: number; alturaSuelo: number }
export type Estructura = Columna | Viga | Radiador
export interface Medidas { ancho: number; fondo: number; alto: number }
/** Un producto concreto de una tienda, con los datos que teclea el usuario. Sus medidas son las del elemento, fijas. */
export interface OrigenTienda {
  tipo: 'tienda'
  proveedor: string
  nombre: string
  referencia?: string
  url?: string
  /** Euros. */
  precio?: number
  /** AAAA-MM-DD en que se anotó el precio. */
  fechaPrecio?: string
}
export type Origen = { tipo: 'generico' } | OrigenTienda
export interface Elemento {
  id: string; tipo: string; posicion: Punto; rotacion: number; medidas: Medidas; alturaSuelo: number
  variantes: Record<string, string | number | boolean>; colores: Record<string, string>; origen: Origen
  /** Medidas propias del tipo además de ancho, fondo y alto (el hueco del rincón de un esquinero), en cm enteros. Opcional: los diseños de antes no lo llevan. */
  medidasExtra?: Record<string, number>
}
export interface DocumentoDiseno { formato: 1; estancia: Estancia; aberturas: Abertura[]; estructura: Estructura[]; elementos: Elemento[] }
