import { renderToStaticMarkup } from 'react-dom/server'
import type { DocumentoDiseno } from '../../nucleo'
import PlanoDelDiseno from './PlanoDelDiseno'

/**
 * Las reglas de `lienzo.css` que el plano necesita para verse igual fuera de la página, con los colores de `base.css`
 * puestos a mano: una imagen svg no ve las hojas de estilo del documento. Si cambia `lienzo.css`, hay que revisarlo.
 */
export const ESTILOS_DEL_PLANO = `
  svg { background: #fff; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
  line, polygon, path { vector-effect: non-scaling-stroke; }
  .lienzo__texto { font-size: calc(12px / var(--escala, 1)); text-anchor: middle; dominant-baseline: central; fill: #2b2622; }
  .capa-planta__muros { fill: #2b2622; }
  .capa-planta__pared { fill: transparent; }
  .capa-aberturas__trazo { stroke: #2b2622; stroke-width: 1; }
  .capa-aberturas__hoja { stroke: #2b2622; stroke-width: 2; }
  .capa-aberturas__barrido { fill: none; stroke: #2b2622; stroke-width: 1; }
  .capa-estructura__contorno { stroke: #2b2622; stroke-width: 1; }
  .capa-estructura__radiador .capa-estructura__contorno { fill: #b9b4ae; }
  .capa-estructura__viga .capa-estructura__contorno { fill: rgb(43 38 34 / 0.12); }
  .capa-elementos__huella { stroke: #2b2622; stroke-width: 1; }
  .capa-elementos__apertura { fill: none; stroke: #6f6862; stroke-width: 1; }
  .capa-elementos__nombres .lienzo__texto { paint-order: stroke; stroke: rgb(255 255 255 / 0.85); stroke-width: calc(3px / var(--escala, 1)); stroke-linejoin: round; }
  .capa-elementos__candado rect { fill: #2b2622; }
  .capa-elementos__candado path { fill: none; stroke: #2b2622; stroke-width: 1.75; }
  .capa-cotas__cota line { stroke: #6f6862; stroke-width: 1; }
  .capa-cotas__cota .lienzo__texto { paint-order: stroke; stroke: #fff; stroke-width: calc(4px / var(--escala, 1)); stroke-linejoin: round; }
`

const RAYADO = 'exportar-rayado'

/** El plano del diseño como svg completo y autónomo (xmlns, tamaño en px y estilos incrustados), como en la hoja para imprimir. */
export function svgDelPlano(doc: DocumentoDiseno): string {
  const marcado = renderToStaticMarkup(<PlanoDelDiseno doc={doc} rayado={RAYADO} />)
  const documento = new DOMParser().parseFromString(marcado, 'image/svg+xml')
  const svg = documento.documentElement
  const [, , ancho, alto] = (svg.getAttribute('viewBox') ?? '0 0 0 0').split(' ')
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  svg.setAttribute('width', ancho ?? '0')
  svg.setAttribute('height', alto ?? '0')
  const estilo = documento.createElementNS('http://www.w3.org/2000/svg', 'style')
  estilo.textContent = ESTILOS_DEL_PLANO
  svg.prepend(estilo)
  return new XMLSerializer().serializeToString(svg)
}

/** Píxeles por px CSS del plano: nítido también impreso o ampliado. */
const ESCALA_PNG = 2

export interface ImagenDelPlano { blob: Blob; extension: 'png' | 'svg' }

/** El plano como PNG; donde no hay canvas (o no se puede pintar), el propio svg. */
export async function exportarPlano(doc: DocumentoDiseno): Promise<ImagenDelPlano> {
  const svg = svgDelPlano(doc)
  const comoSvg: ImagenDelPlano = { blob: new Blob([svg], { type: 'image/svg+xml' }), extension: 'svg' }
  const lienzo = document.createElement('canvas')
  const ctx = lienzo.getContext('2d')
  if (!ctx) return comoSvg
  try {
    const imagen = new Image()
    imagen.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    await imagen.decode()
    lienzo.width = imagen.width * ESCALA_PNG
    lienzo.height = imagen.height * ESCALA_PNG
    ctx.scale(ESCALA_PNG, ESCALA_PNG)
    ctx.drawImage(imagen, 0, 0)
    const png = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, 'image/png'))
    return png ? { blob: png, extension: 'png' } : comoSvg
  } catch {
    return comoSvg
  }
}
