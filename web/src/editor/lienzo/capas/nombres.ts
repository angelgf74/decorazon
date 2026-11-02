import type { Punto } from '../../../nucleo'

/** Alto de una línea de nombre y ancho medio de una letra, en px de pantalla (el texto del plano mide 12 px). */
export const ALTO_LINEA_PX = 14
const ANCHO_LETRA_PX = 7

/** Un nombre del plano: dónde se escribe y a qué altura del suelo está su pieza (la más alta va arriba si se apilan). */
export interface Etiqueta { id: string; nombre: string; punto: Punto; altura: number }

/**
 * Los nombres que se pisarían en pantalla (un espejo sobre un lavabo, una lámpara junto a una mesita) se escriben uno
 * debajo del otro, repartidos alrededor de su sitio y con el de la pieza más alta arriba; los demás no se mueven.
 * `escala` son px de pantalla por cm: el texto no cambia de tamaño con el zoom, así que lo que se pisa depende de él.
 */
export function colocarNombres(etiquetas: Etiqueta[], escala: number): Etiqueta[] {
  const alto = ALTO_LINEA_PX / escala
  const ancho = (e: Etiqueta) => (e.nombre.length * ANCHO_LETRA_PX) / escala
  const sePisan = (a: Etiqueta, b: Etiqueta) =>
    Math.abs(a.punto.x - b.punto.x) < (ancho(a) + ancho(b)) / 2 && Math.abs(a.punto.y - b.punto.y) < alto

  // Grupos por contacto en cadena: si a pisa a b y b pisa a c, van los tres juntos.
  const grupo = etiquetas.map((_, i) => i)
  const raiz = (i: number): number => (grupo[i] === i ? i : (grupo[i] = raiz(grupo[i]!)))
  for (let i = 0; i < etiquetas.length; i++) {
    for (let j = i + 1; j < etiquetas.length; j++) {
      if (sePisan(etiquetas[i]!, etiquetas[j]!)) grupo[raiz(j)] = raiz(i)
    }
  }

  const resultado = [...etiquetas]
  const porGrupo = new Map<number, number[]>()
  etiquetas.forEach((_, i) => porGrupo.set(raiz(i), [...(porGrupo.get(raiz(i)) ?? []), i]))
  for (const indices of porGrupo.values()) {
    if (indices.length < 2) continue
    const centro = indices.reduce((s, i) => s + etiquetas[i]!.punto.y, 0) / indices.length
    const apilados = [...indices].sort((a, b) => etiquetas[b]!.altura - etiquetas[a]!.altura || a - b)
    apilados.forEach((i, k) => {
      const e = etiquetas[i]!
      resultado[i] = { ...e, punto: { x: e.punto.x, y: centro + (k - (apilados.length - 1) / 2) * alto } }
    })
  }
  return resultado
}
