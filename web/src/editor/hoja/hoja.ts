import {
  capitalizar, desplazarPoligono, esUrlDeProducto, nombreDeElemento, valorVariante, type Catalogo, type DocumentoDiseno, type OrigenTienda, type Punto,
} from '../../nucleo'
import { textos } from '../../textos'
import { formatoFecha, formatoPrecio } from '../comunes/formatos'
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
  /** Los datos del producto, si es de una tienda: «Armario · IKEA · ref. …», la URL y el precio con su fecha. */
  tienda: { linea: string; url?: string; precio?: string } | null
}

const t = textos.hoja

/** Una fila por mueble, en el orden del diseño. */
export function filasDeMuebles(doc: DocumentoDiseno, catalogo: Catalogo): FilaMueble[] {
  return doc.elementos.map((e) => {
    const def = catalogo.get(e.tipo)
    const { ancho, fondo } = e.medidas
    const alto = def?.altoReal?.(e) ?? e.medidas.alto
    return {
      id: e.id,
      nombre: nombreDeElemento(def, e),
      medidas: `${ancho} × ${fondo} × ${alto} cm`,
      alturaSuelo: e.alturaSuelo > 0 ? t.alturaSuelo(e.alturaSuelo) : null,
      variantes: def ? def.variantes.map((v) => `${v.etiqueta}: ${etiquetaValor(valorVariante(def, e, v.clave))}`) : [],
      colores: def ? def.zonasColor.map((z) => ({ etiqueta: z.etiqueta, color: e.colores[z.clave] ?? z.defecto })) : [],
      tienda: e.origen.tipo === 'tienda' ? filaTienda(e.origen, def ? capitalizar(def.nombre) : e.tipo) : null,
    }
  })
}

function filaTienda(o: OrigenTienda, tipo: string): NonNullable<FilaMueble['tienda']> {
  return {
    linea: textos.tienda.lineaHoja(tipo, o.proveedor, o.referencia),
    // El validador ya rechaza otras: se vuelve a mirar porque se enseña (y en la página compartida, se enlaza).
    ...(o.url && esUrlDeProducto(o.url) && { url: o.url }),
    ...(o.precio !== undefined && {
      precio: textos.tienda.precioAnotado(formatoPrecio(o.precio), o.fechaPrecio && formatoFecha(o.fechaPrecio)),
    }),
  }
}

/** La suma de los precios anotados (en céntimos, para no arrastrar decimales) y cuántos productos la forman; null sin ninguno. */
export function totalAnotado(doc: DocumentoDiseno): { importe: number; productos: number } | null {
  const precios = doc.elementos.flatMap((e) => (e.origen.tipo === 'tienda' && e.origen.precio !== undefined ? [e.origen.precio] : []))
  if (precios.length === 0) return null
  const centimos = precios.reduce((suma, p) => suma + Math.round(p * 100), 0)
  return { importe: centimos / 100, productos: precios.length }
}
