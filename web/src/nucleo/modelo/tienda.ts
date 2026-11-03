// Reglas de los datos de un mueble de tienda, que teclea el usuario (fase 1: sin llamadas a ninguna tienda).

export const LIMITES_TIENDA = { proveedor: 60, nombre: 80, referencia: 40, url: 2000, precio: 1_000_000 } as const

/** Las que se sugieren al escribir la tienda; se puede poner cualquier otra. */
export const TIENDAS_SUGERIDAS = [
  'IKEA', 'Leroy Merlin', 'Conforama', 'El Corte Inglés', 'Kave Home', 'Maisons du Monde', 'Sklum', 'Amazon',
] as const

// Parámetros que solo sirven para seguir al visitante: no identifican el producto.
const SEGUIMIENTO = /^(utm_.*|gclid|gbraid|wbraid|fbclid|msclkid|mc_cid|mc_eid|igshid|yclid|ttclid|srsltid|awc|cjevent|irclickid|_ga)$/i

function comoUrl(texto: string): URL | null {
  try {
    return new URL(texto)
  } catch {
    return null
  }
}

/** http o https con un dominio de verdad (con punto): «https://» o «https://ikea» no son la página de un producto. */
function esWeb(u: URL): boolean {
  return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.')
}

/**
 * La dirección de un producto lista para guardar: con https:// si se pegó sin esquema, solo http o https y sin
 * parámetros de seguimiento. null si no vale (otro esquema, como javascript:, o no es una dirección).
 */
export function limpiarUrl(texto: string): string | null {
  const t = texto.trim()
  if (t === '') return null
  const u = comoUrl(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`)
  if (!u || !esWeb(u)) return null
  for (const clave of [...u.searchParams.keys()]) if (SEGUIMIENTO.test(clave)) u.searchParams.delete(clave)
  const limpia = u.toString()
  return limpia.length <= LIMITES_TIENDA.url ? limpia : null
}

/** Si una dirección guardada se puede enlazar. La comprueba también el validador: un diseño compartido la pinta otra persona. */
export function esUrlDeProducto(url: unknown): boolean {
  if (typeof url !== 'string' || url.length > LIMITES_TIENDA.url) return false
  const u = comoUrl(url)
  return u !== null && esWeb(u)
}

/** Euros de 0 a un millón, con dos decimales como mucho. */
export function esPrecio(v: unknown): v is number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > LIMITES_TIENDA.precio) return false
  return Math.abs(Math.round(v * 100) - v * 100) < 1e-6
}

/** Una fecha real en AAAA-MM-DD. */
export function esFechaPrecio(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}
