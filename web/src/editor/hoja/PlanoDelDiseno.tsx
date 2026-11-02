import type { CSSProperties } from 'react'
import type { DocumentoDiseno } from '../../nucleo'
import { textos } from '../../textos'
import CapaAberturas from '../lienzo/capas/CapaAberturas'
import CapaCotas from '../lienzo/capas/CapaCotas'
import CapaElementos from '../lienzo/capas/CapaElementos'
import CapaEstructura, { PatronRayado } from '../lienzo/capas/CapaEstructura'
import CapaPlanta from '../lienzo/capas/CapaPlanta'
import type { Vista2D } from '../lienzo/vista'
import '../lienzo/lienzo.css'
import { ALTO_MAXIMO_PLANO_PX, ANCHO_PLANO_PX, marcoDeImpresion } from './hoja'

/**
 * Las capas del plano para ver, no para editar: estancia, estructura, aberturas, muebles con nombre y cotas, sin
 * selección ni avisos, con la vista dada. `rayado` es el id del patrón de la estructura, que va en los `defs` del svg.
 */
export function CapasDelPlano({ doc, vista, rayado }: { doc: DocumentoDiseno; vista: Vista2D; rayado: string }) {
  return (
    // --escala deja el texto del plano al mismo tamaño que en el editor (lienzo.css).
    <g transform={`translate(${vista.x} ${vista.y}) scale(${vista.escala})`} style={{ '--escala': vista.escala } as CSSProperties}>
      <CapaPlanta documento={doc} />
      <CapaEstructura documento={doc} seleccion={null} vigas={false} rayado={rayado} />
      <CapaAberturas documento={doc} seleccion={null} />
      <CapaElementos documento={doc} conflictos={[]} seleccion={null} escala={vista.escala} />
      <CapaEstructura documento={doc} seleccion={null} vigas rayado={rayado} />
      <CapaCotas documento={doc} seleccion={null} escala={vista.escala} soloVer />
    </g>
  )
}

interface Props {
  doc: DocumentoDiseno
  rayado: string
  className?: string
  /**
   * Ancho del dibujo en px. Si el svg se pinta a ese mismo ancho, los textos salen al tamaño del editor; por defecto,
   * el de la hoja para imprimir.
   */
  ancho?: number
  altoMaximo?: number
}

/** El plano entero, encuadrado en `ancho` sin pasar de `altoMaximo`. */
export default function PlanoDelDiseno({ doc, rayado, className, ancho = ANCHO_PLANO_PX, altoMaximo = ALTO_MAXIMO_PLANO_PX }: Props) {
  const { planta, grosorPared } = doc.estancia
  const marco = marcoDeImpresion(planta, grosorPared, ancho, altoMaximo)
  return (
    <svg className={className} viewBox={`0 0 ${marco.ancho} ${marco.alto}`} role="img" aria-label={textos.hoja.plano}>
      <defs><PatronRayado id={rayado} /></defs>
      <CapasDelPlano doc={doc} vista={marco.vista} rayado={rayado} />
    </svg>
  )
}
