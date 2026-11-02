import type { DocumentoDiseno } from '../modelo/documento'

/**
 * Cada número a 2 decimales, para que `JSON.stringify` nunca emita exponentes. No muta la entrada y copia solo las ramas
 * que cambian: lo que ya estaba redondeado conserva su referencia (la 3D no vuelve a calcular los muebles que no cambian).
 */
export function redondearNumeros<T>(valor: T): T {
  if (typeof valor === 'number') {
    const r = Math.round(valor * 100) / 100
    return (r === 0 ? 0 : r) as T
  }
  if (Array.isArray(valor)) {
    const r = valor.map(redondearNumeros)
    return (r.every((v, i) => Object.is(v, valor[i])) ? valor : r) as T
  }
  if (typeof valor === 'object' && valor !== null) {
    const entradas = Object.entries(valor)
    const r = entradas.map(([k, v]) => [k, redondearNumeros(v)] as const)
    return (r.every(([, v], i) => Object.is(v, entradas[i]![1])) ? valor : Object.fromEntries(r)) as T
  }
  return valor
}

export function serializarDocumento(doc: DocumentoDiseno): string {
  return JSON.stringify(redondearNumeros(doc))
}
