import { capitalizar, desplazarPoligono, valorVariante, type Catalogo, type DocumentoDiseno, type Punto } from '../../nucleo'
import { textos } from '../../textos'
import { etiquetaValor } from '../comunes/variantes'
import { encuadrar, MARGEN_ENCUADRE_PX, type Vista2D } from '../lienzo/vista'

/** Ancho del plano en la hoja, en px CSS: cabe en un A4 vertical con márgenes de 12 mm. */
export const ANCHO_PLANO_PX = 680
/** Alto máximo del plano: deja sitio en la primera página para empezar la lista de muebles. */
export const ALTO_MAXIMO_PLANO_PX = 600

export interface MarcoDeImpresion { ancho: number; alto: number; vista: Vista2D }

/** Tamaño del plano en la hoja y su vista: la estancia, con sus muros y el sitio de las cotas, llena el ancho sin pasar del alto máximo. */
export function marcoDeImpresion(planta: Punto[], grosorPared: number, ancho = ANCHO_PLANO_PX, altoMaximo = ALTO_MAXIMO_PLANO_PX): MarcoDeImpresion {
  const exterior = desplazarPoligono(planta, grosorPared)
  const { escala } = encuadrar(exterior, ancho, altoMaximo)
  const ys = exterior.map((p) => p.y)
  const alto = Math.min(altoMaximo, (Math.max(...ys) - Math.min(...ys)) * escala + 2 * MARGEN_ENCUADRE_PX)
  return { ancho, alto, vista: encuadrar(exterior, ancho, alto) }
}

export interface FilaMueble {
  id: string
  nombre: string
  medidas: string
  alturaSuelo: string | null
  variantes: string[]
  colores: { etiqueta: string; color: string }[]
}

const t = textos.hoja

/** Una fila por mueble, en el orden del diseño. */
export function filasDeMuebles(doc: DocumentoDiseno, catalogo: Catalogo): FilaMueble[] {
  return doc.elementos.map((e) => {
    const def = catalogo.get(e.tipo)
    const { ancho, fondo, alto } = e.medidas
    return {
      id: e.id,
      nombre: def ? capitalizar(def.nombre) : e.tipo,
      medidas: `${ancho} × ${fondo} × ${alto} cm`,
      alturaSuelo: e.alturaSuelo > 0 ? t.alturaSuelo(e.alturaSuelo) : null,
      variantes: def ? def.variantes.map((v) => `${v.etiqueta}: ${etiquetaValor(valorVariante(def, e, v.clave))}`) : [],
      colores: def ? def.zonasColor.map((z) => ({ etiqueta: z.etiqueta, color: e.colores[z.clave] ?? z.defecto })) : [],
    }
  })
}
