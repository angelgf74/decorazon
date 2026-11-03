import { LIMITES_TIENDA, limpiarUrl } from '../modelo/tienda'
import type { Catalogo } from './tipos'

/** Lo que se saca del texto de un enlace; lo que no se encuentra no viene. */
export interface DatosDeEnlace {
  proveedor?: string
  nombre?: string
  referencia?: string
  /** El id del tipo de Decorazon que nombra la dirección. */
  tipo?: string
  /** Hex del primer color que nombra la dirección. */
  color?: string
}

// La parte del dominio registrado que identifica la tienda, sea cual sea el país (ikea.com, ikea.pt, ikea.co.uk…).
const TIENDAS: [string, string][] = [
  ['ikea', 'IKEA'], ['leroymerlin', 'Leroy Merlin'], ['conforama', 'Conforama'], ['elcorteingles', 'El Corte Inglés'],
  ['kavehome', 'Kave Home'], ['maisonsdumonde', 'Maisons du Monde'], ['sklum', 'Sklum'], ['amazon', 'Amazon'],
]
// Dominios de país de dos partes: en ikea.co.uk, la tienda es la etiqueta antes de «co.uk».
const SEGUNDO_NIVEL = new Set(['co', 'com', 'net', 'org'])

// Palabras de color de las direcciones (sin tildes), con su tono aproximado.
const COLORES: [string, string][] = [
  ['gris oscuro', '#5e5e5c'], ['blanco', '#f2f2f0'], ['negro', '#2b2b2b'], ['gris', '#9a9a98'], ['beige', '#d9c8a9'],
  ['crema', '#efe6d2'], ['roble', '#c49a6c'], ['nogal', '#6b4a33'], ['haya', '#d5a97a'], ['pino', '#e0c08f'],
  ['azul', '#4a6a8a'], ['verde', '#6f8f6a'], ['rosa', '#e3b5b5'], ['rojo', '#b5413a'], ['amarillo', '#e8c547'],
]

// Un tipo detrás de estas palabras es un complemento, no el producto: «lámpara de mesa», «cabecero de cama».
const COMPLEMENTO = new Set(['de', 'del', 'para', 'con'])

const sinTildes = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const palabras = (t: string) => sinTildes(t).split(/[\s\-_+]+/).filter((p) => p !== '')
/** Letras y cifras, cinco o más con alguna cifra: un código del producto, no una palabra de su nombre. */
const esCodigo = (p: string) => /\d/.test(p) && p.length >= 5

function tiendaDe(host: string): [string, string] | undefined {
  const etiquetas = host.toLowerCase().split('.')
  if (etiquetas.length < 2) return undefined
  const conPais = etiquetas.length >= 3 && SEGUNDO_NIVEL.has(etiquetas.at(-2)!) && etiquetas.at(-1)!.length === 2
  const registrada = etiquetas.at(conPais ? -3 : -2)
  return TIENDAS.find(([raiz]) => raiz === registrada)
}

/** Dónde aparece `buscadas` dentro de `en`, palabra a palabra, sin contar las apariciones tras un complemento. */
function posicion(en: string[], buscadas: string[]): number {
  for (let i = 0; i + buscadas.length <= en.length; i++) {
    if (i > 0 && COMPLEMENTO.has(en[i - 1]!)) continue
    if (buscadas.every((p, k) => en[i + k] === p)) return i
  }
  return -1
}

/** El tipo que nombran las palabras: el de nombre más largo («armario esquinero» antes que «armario») y, a igual largo, el primero. */
function tipoNombrado(ps: string[], catalogo: Catalogo): { id: string; desde: number } | undefined {
  let mejor: { id: string; desde: number; largo: number } | undefined
  for (const def of catalogo.values()) {
    const nombre = palabras(def.nombre)
    const desde = posicion(ps, nombre)
    if (desde < 0) continue
    if (!mejor || nombre.length > mejor.largo || (nombre.length === mejor.largo && desde < mejor.desde)) mejor = { id: def.id, desde, largo: nombre.length }
  }
  return mejor && { id: mejor.id, desde: mejor.desde }
}

/** El primer color que aparece en la dirección (no el primero de la tabla). */
function colorNombrado(ps: string[]): string | undefined {
  for (let i = 0; i < ps.length; i++) {
    const encontrado = COLORES.find(([nombre]) => nombre.split(' ').every((p, k) => ps[i + k] === p))
    if (encontrado) return encontrado[1]
  }
  return undefined
}

const recortar = (t: string) => t.slice(0, LIMITES_TIENDA.nombre).trim()

function tramosDe(u: URL): string[] {
  return u.pathname.split('/').filter((t) => t !== '').map((t) => {
    try {
      return decodeURIComponent(t)
    } catch {
      return t
    }
  })
}

/**
 * Lo que dice el texto de la dirección de un producto: la tienda (por el dominio), el nombre, la referencia (solo en
 * IKEA, que la pone al final: «…-s29502652» → «295.026.52»), el tipo de Decorazon y el color. No se abre la página:
 * la spec (§6.3) y las condiciones de las tiendas no lo permiten; con lo que se lee aquí, el usuario rellena menos.
 */
export function leerEnlace(url: string, catalogo: Catalogo): DatosDeEnlace {
  const limpia = limpiarUrl(url)
  if (limpia === null) return {}
  const u = new URL(limpia)
  const tienda = tiendaDe(u.hostname)
  const ikea = tienda?.[0] === 'ikea'
  const datos: DatosDeEnlace = tienda ? { proveedor: tienda[1] } : {}
  const tramos = tramosDe(u).map((t) => t.replace(/\.[a-z]{2,5}$/i, ''))
  // En IKEA, el producto va tras «/p/». En las demás, el último tramo con dos palabras o más y sin «=» (Amazon pone
  // «ref=…» al final y el nombre antes de «/dp/»).
  const iP = tramos.indexOf('p')
  const tramo = ikea && iP >= 0
    ? tramos[iP + 1]
    : tramos.findLast((t) => !t.includes('=') && palabras(t).filter((p) => /^[a-zñ]+$/.test(p)).length >= 2)
  if (!tramo) return datos
  let ps = palabras(tramo)
  let original = tramo.replace(/[-_+]+/g, ' ').trim().split(/\s+/)

  const codigo = /^s?(\d{3})(\d{3})(\d{2})$/.exec(ps.at(-1) ?? '')
  if (ikea && codigo) datos.referencia = `${codigo[1]}.${codigo[2]}.${codigo[3]}`
  // Los códigos del principio o del final no son parte del nombre.
  if (ps.length > 0 && esCodigo(ps.at(-1)!)) {
    ps = ps.slice(0, -1)
    original = original.slice(0, -1)
  }
  if (ps.length > 0 && esCodigo(ps[0]!)) {
    ps = ps.slice(1)
    original = original.slice(1)
  }
  if (ps.length === 0) return datos

  const tipo = tipoNombrado(ps, catalogo)
  if (tipo) datos.tipo = tipo.id
  const color = colorNombrado(ps)
  if (color) datos.color = color

  if (ikea) {
    // En IKEA, el nombre del producto son las palabras antes del tipo, en mayúsculas: «PAX / GRIMO». Sin tipo, la primera.
    const antes = tipo && tipo.desde > 0 ? ps.slice(0, tipo.desde) : ps.slice(0, 1)
    datos.nombre = recortar(antes.map((p) => p.toUpperCase()).join(' / '))
  }
  else {
    const texto = original.join(' ')
    if (texto) datos.nombre = recortar(texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase())
  }
  return datos
}
