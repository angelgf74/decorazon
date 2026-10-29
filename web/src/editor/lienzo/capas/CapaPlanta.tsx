import type { PointerEvent } from 'react'
import { desplazarPoligono, type DocumentoDiseno, type Punto } from '../../../nucleo'
import type { Seleccion } from '../../estado/almacen'
import { esBotonPrincipal, puntos } from './comun'

interface Props {
  documento: DocumentoDiseno
  seleccion?: Seleccion
  /** Solo en el paso 1: cada tramo de muro se puede pulsar para seleccionar su pared. */
  alPulsarPared?: (indice: number) => void
}

const trazado = (ps: Punto[]): string => `M${ps.map((p) => `${p.x},${p.y}`).join('L')}Z`

export default function CapaPlanta({ documento, seleccion, alPulsarPared }: Props) {
  const { planta, grosorPared, colorSuelo } = documento.estancia
  const exterior = desplazarPoligono(planta, grosorPared)
  const n = planta.length
  return (
    <g className="capa-planta">
      <polygon points={puntos(planta)} fill={colorSuelo} />
      <path className="capa-planta__muros" d={`${trazado(exterior)} ${trazado(planta)}`} fillRule="evenodd" />
      {alPulsarPared && planta.map((p, i) => {
        const j = (i + 1) % n
        const elegida = seleccion?.tipo === 'pared' && seleccion.indice === i
        return (
          <polygon
            key={i}
            data-pared={i}
            className={`capa-planta__pared lienzo--pulsable${elegida ? ' lienzo--seleccionado' : ''}`}
            points={puntos([p, planta[j], exterior[j], exterior[i]])}
            onPointerDown={(ev: PointerEvent<SVGPolygonElement>) => {
              if (!esBotonPrincipal(ev)) return
              ev.stopPropagation()
              alPulsarPared(i)
            }}
          />
        )
      })}
    </g>
  )
}
