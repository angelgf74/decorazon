import { useSyncExternalStore } from 'react'

/** Ids de los tipos marcados con la estrella. */
const CLAVE_FAVORITOS = 'decorazon.catalogo.favoritos'
/** Ids de los últimos tipos añadidos al plano, el más reciente primero. */
const CLAVE_RECIENTES = 'decorazon.catalogo.recientes'
export const MAXIMO_RECIENTES = 6

type Clave = typeof CLAVE_FAVORITOS | typeof CLAVE_RECIENTES

/** Lo que `localStorage` no pudo guardar (modo privado, bloqueado o lleno): se lee cuando tampoco se puede leer de él y dura lo que la pestaña. */
const memoria = new Map<Clave, string>()
/** Último texto leído y su lista, para devolver la misma referencia mientras no cambie (lo pide `useSyncExternalStore`). */
const ultimo = new Map<Clave, { texto: string | null; lista: string[] }>()
const oyentes = new Set<() => void>()

const SIN_NADA: string[] = []

function leer(clave: Clave): string[] {
  let texto: string | null
  try {
    texto = localStorage.getItem(clave)
  } catch {
    texto = memoria.get(clave) ?? null
  }
  const u = ultimo.get(clave)
  if (u && u.texto === texto) return u.lista
  let lista = SIN_NADA
  if (texto !== null) {
    try {
      const valor: unknown = JSON.parse(texto)
      if (Array.isArray(valor) && valor.every((x) => typeof x === 'string')) lista = valor
    } catch {
      // Un valor corrupto cuenta como vacío.
    }
  }
  ultimo.set(clave, { texto, lista })
  return lista
}

function escribir(clave: Clave, lista: string[]): void {
  const texto = JSON.stringify(lista)
  try {
    localStorage.setItem(clave, texto)
  } catch {
    memoria.set(clave, texto)
  }
  oyentes.forEach((f) => f())
}

export const leerFavoritos = (): string[] => leer(CLAVE_FAVORITOS)
export const leerRecientes = (): string[] => leer(CLAVE_RECIENTES)

/** Marca o desmarca un tipo como favorito. */
export function alternarFavorito(id: string): void {
  const actuales = leerFavoritos()
  escribir(CLAVE_FAVORITOS, actuales.includes(id) ? actuales.filter((x) => x !== id) : [...actuales, id])
}

/** Apunta un tipo como usado hace poco: pasa al principio y la lista se queda en `MAXIMO_RECIENTES`. */
export function anotarReciente(id: string): void {
  escribir(CLAVE_RECIENTES, [id, ...leerRecientes().filter((x) => x !== id)].slice(0, MAXIMO_RECIENTES))
}

function suscribir(f: () => void): () => void {
  oyentes.add(f)
  return () => oyentes.delete(f)
}

/** Favoritos y recientes, repintando al cambiar (también cuando lo cambia el almacén al añadir un tipo). */
export function useCatalogoLocal(): { favoritos: string[]; recientes: string[] } {
  const favoritos = useSyncExternalStore(suscribir, leerFavoritos)
  const recientes = useSyncExternalStore(suscribir, leerRecientes)
  return { favoritos, recientes }
}
