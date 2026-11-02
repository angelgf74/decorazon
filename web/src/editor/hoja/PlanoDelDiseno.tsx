import type { CSSProperties } from 'react'
import type { DocumentoDiseno } from '../../nucleo'
import { textos } from '../../textos'
import CapaAberturas from '../lienzo/capas/CapaAberturas'
import CapaCotas from '../lienzo/capas/CapaCotas'
import CapaElementos from '../lienzo/capas/CapaElementos'
import CapaEstructura, { PatronRayado } from '../lienzo/capas/CapaEstructura'
import CapaPlanta from '../lienzo/capas/CapaPlanta'
import '../lienzo/lienzo.css'
import { marcoDeImpresion } from './hoja'

/**
 * El plano del diseño para ver, no para editar: estancia, estructura, aberturas, muebles con nombre y cotas,
 * sin selección ni avisos. `rayado` es el id del patrón de la estructura, único en la página.
 */
export default function PlanoDelDiseno({ doc, rayado, className }: { doc: DocumentoDiseno; rayado: string; className?: string }) {
  const { planta, grosorPared } = doc.estancia
  const { ancho, alto, vista } = marcoDeImpresion(planta, grosorPared)
  return (
    <svg className={className} viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={textos.hoja.plano}>
      <defs><PatronRayado id={rayado} /></defs>
      {/* --escala deja el texto del plano al mismo tamaño que en el editor (lienzo.css). */}
      <g transform={`translate(${vista.x} ${vista.y}) scale(${vista.escala})`} style={{ '--escala': vista.escala } as CSSProperties}>
        <CapaPlanta documento={doc} />
        <CapaEstructura documento={doc} seleccion={null} vigas={false} rayado={rayado} />
        <CapaAberturas documento={doc} seleccion={null} />
        <CapaElementos documento={doc} conflictos={[]} seleccion={null} />
        <CapaEstructura documento={doc} seleccion={null} vigas rayado={rayado} />
        <CapaCotas documento={doc} seleccion={null} escala={vista.escala} soloVer />
      </g>
    </svg>
  )
}
