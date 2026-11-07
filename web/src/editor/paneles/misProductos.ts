import { useSyncExternalStore } from 'react'
import { catalogoBase, esFechaPrecio, esPrecio, esUrlDeProducto, LIMITES_TIENDA, type Medidas, type OrigenTienda } from '../../nucleo'

/**
 * Mis productos de tienda (M-17): los que el usuario ya tecleó, para volver a usarlos en otro mueble u otro diseño sin
 * escribirlos otra vez. Viven en `localStorage` (no en la cuenta: sin datos personales, como los favoritos del catálogo),
 * el último usado primero y sin repetir. Lo que no valida al leerlo (un tipo que ya no existe, unas medidas fuera de
 * rango, un enlace que no es web) se descarta: se escriben en el documento tal cual.
 */
export const CLAVE_MIS_PRODUCTOS = 'decorazon.tienda.productos'
export const MAXIMO_PRODUCTOS = 30

export interface ProductoGuardado {
  tipo: string
  origen: OrigenTienda
  medidas: Medidas
  medidasExtra?: Record<string, number>
}

/** Lo que `localStorage` no pudo guardar (lleno o bloqueado): manda sobre lo guardado mientras dure la pestaña. */
let memoria: string | null = null
let ultimo: { texto: string | null; lista: ProductoGuardado[] } | null = null
const oyentes = new Set<() => void>()
const NINGUNO: ProductoGuardado[] = []

const textoEntre = (v: unknown, min: number, max: number) => typeof v === 'string' && v.trim() === v && v.length >= min && v.length <= max

function esOrigen(o: unknown): o is OrigenTienda {
  if (typeof o !== 'object' || o === null) return false
  const x = o as Record<string, unknown>
  return x.tipo === 'tienda'
    && textoEntre(x.proveedor, 1, LIMITES_TIENDA.proveedor)
    && textoEntre(x.nombre, 1, LIMITES_TIENDA.nombre)
    && (x.referencia === undefined || textoEntre(x.referencia, 0, LIMITES_TIENDA.referencia))
    && (x.url === undefined || esUrlDeProducto(x.url))
    && (x.precio === undefined || (esPrecio(x.precio) && esFechaPrecio(x.fechaPrecio)))
}

function esProducto(p: unknown): p is ProductoGuardado {
  if (typeof p !== 'object' || p === null) return false
  const x = p as Record<string, unknown>
  const def = typeof x.tipo === 'string' ? catalogoBase.get(x.tipo) : undefined
  if (!def || !esOrigen(x.origen) || typeof x.medidas !== 'object' || x.medidas === null) return false
  const m = x.medidas as Record<string, unknown>
  const enRango = (k: keyof Medidas) => Number.isInteger(m[k]) && (m[k] as number) >= def.medidas[k].min && (m[k] as number) <= def.medidas[k].max
  if (!enRango('ancho') || !enRango('fondo') || !enRango('alto')) return false
  if (x.medidasExtra === undefined) return true
  return typeof x.medidasExtra === 'object' && x.medidasExtra !== null
    && Object.values(x.medidasExtra).every((v) => Number.isInteger(v) && (v as number) >= 0)
}

export function leerProductos(): ProductoGuardado[] {
  let texto = memoria
  if (texto === null) {
    try {
      texto = localStorage.getItem(CLAVE_MIS_PRODUCTOS)
    } catch {
      texto = null
    }
  }
  if (ultimo && ultimo.texto === texto) return ultimo.lista
  let lista = NINGUNO
  if (texto !== null) {
    try {
      const valor: unknown = JSON.parse(texto)
      if (Array.isArray(valor)) lista = valor.filter(esProducto)
    } catch {
      // Un valor roto cuenta como vacío.
    }
  }
  ultimo = { texto, lista }
  return lista
}

function escribir(lista: ProductoGuardado[]): void {
  const texto = JSON.stringify(lista)
  try {
    localStorage.setItem(CLAVE_MIS_PRODUCTOS, texto)
    memoria = null
  } catch {
    memoria = texto
  }
  oyentes.forEach((f) => f())
}

/** El mismo producto es la misma tienda, nombre y referencia (sin distinguir mayúsculas). */
const clave = (p: ProductoGuardado) => [p.tipo, p.origen.proveedor, p.origen.nombre, p.origen.referencia ?? ''].join('\u0001').toLowerCase()

/** Lo apunta el primero; si ya estaba, lo sustituye (precio y medidas nuevos). */
export function guardarProducto(p: ProductoGuardado): void {
  if (!esProducto(p)) return
  const k = clave(p)
  escribir([p, ...leerProductos().filter((x) => clave(x) !== k)].slice(0, MAXIMO_PRODUCTOS))
}

export function olvidarProducto(p: ProductoGuardado): void {
  const k = clave(p)
  escribir(leerProductos().filter((x) => clave(x) !== k))
}

export const productosDelTipo = (tipo: string): ProductoGuardado[] => leerProductos().filter((p) => p.tipo === tipo)

function suscribir(f: () => void): () => void {
  oyentes.add(f)
  return () => { oyentes.delete(f) }
}

export function useMisProductos(): ProductoGuardado[] {
  return useSyncExternalStore(suscribir, leerProductos, () => NINGUNO)
}

/** Solo para los tests. */
export function reiniciarMisProductos(): void {
  memoria = null
  ultimo = null
}
