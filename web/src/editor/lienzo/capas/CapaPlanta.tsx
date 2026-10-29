import { desplazarPoligono, type DocumentoDiseno, type Punto } from '../../../nucleo'
import { puntos } from './comun'

const trazado = (ps: Punto[]): string => `M${ps.map((p) => `${p.x},${p.y}`).join('L')}Z`

export default function CapaPlanta({ documento }: { documento: DocumentoDiseno }) {
  const { planta, grosorPared, colorSuelo } = documento.estancia
  const exterior = desplazarPoligono(planta, grosorPared)
  return (
    <g className="capa-planta">
      <polygon points={puntos(planta)} fill={colorSuelo} />
      <path className="capa-planta__muros" d={`${trazado(exterior)} ${trazado(planta)}`} fillRule="evenodd" />
    </g>
  )
}
