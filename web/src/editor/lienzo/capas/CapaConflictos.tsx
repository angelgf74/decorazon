import type { Conflicto } from '../../../nucleo'
import { puntos } from './comun'

export default function CapaConflictos({ conflictos }: { conflictos: Conflicto[] }) {
  return (
    <g className="capa-conflictos">
      {conflictos.map((c, i) => c.zona && <polygon key={i} data-zona-conflicto="" points={puntos(c.zona)} />)}
    </g>
  )
}
