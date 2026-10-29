import type { DocumentoDiseno } from '../modelo/documento'

/** Copia profunda con cada número a 2 decimales, para que `JSON.stringify` nunca emita exponentes. */
export function redondearNumeros<T>(valor: T): T {
  if (typeof valor === 'number') {
    const r = Math.round(valor * 100) / 100
    return (r === 0 ? 0 : r) as T
  }
  if (Array.isArray(valor)) return valor.map(redondearNumeros) as T
  if (typeof valor === 'object' && valor !== null) {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, redondearNumeros(v)])) as T
  }
  return valor
}

export function serializarDocumento(doc: DocumentoDiseno): string {
  return JSON.stringify(redondearNumeros(doc))
}
