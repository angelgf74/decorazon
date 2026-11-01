import type { Conflicto } from '../../../nucleo'
import { puntos, trazado } from './comun'

export default function CapaConflictos({ conflictos }: { conflictos: Conflicto[] }) {
  return (
    <g className="capa-conflictos">
      {conflictos.map((c, i) => {
        if (!c.zona) return null
        // Con hueco, solo se pinta lo que sale: la huella menos la parte que queda dentro (relleno par-impar).
        if (c.huecoDeZona) return <path key={i} data-zona-conflicto="" fillRule="evenodd" d={`${trazado(c.zona)} ${trazado(c.huecoDeZona)}`} />
        return <polygon key={i} data-zona-conflicto="" points={puntos(c.zona)} />
      })}
    </g>
  )
}
