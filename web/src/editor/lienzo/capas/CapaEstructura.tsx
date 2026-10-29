import { obstaculosDeEstancia, type DocumentoDiseno, type Punto } from '../../../nucleo'
import { textos } from '../../../textos'
import type { Seleccion } from '../../estado/almacen'
import { manejador, puntos, type AlPulsar } from './comun'

interface Props {
  documento: DocumentoDiseno
  seleccion: Seleccion
  /** true: solo las vigas, que van por el techo y se pintan encima de los muebles; false: columnas y radiadores. */
  vigas: boolean
  alPulsar?: AlPulsar
}

const centro = (ps: Punto[]): Punto => ({
  x: ps.reduce((s, p) => s + p.x, 0) / ps.length,
  y: ps.reduce((s, p) => s + p.y, 0) / ps.length,
})

/** La columna se rellena con el patrón `#lienzo-rayado`, que define el `Lienzo`. */
export default function CapaEstructura({ documento, seleccion, vigas, alPulsar }: Props) {
  // Las huellas salen del núcleo, las mismas con las que se calculan los conflictos.
  const huellas = new Map(obstaculosDeEstancia(documento).fisicos.map((o) => [o.id, o.prisma.huella]))
  return (
    <g className="capa-estructura">
      {documento.estructura.filter((e) => (e.tipo === 'viga') === vigas).map((e) => {
        const huella = huellas.get(e.id)
        if (!huella) return null
        const elegida = seleccion?.tipo === 'estructura' && seleccion.id === e.id
        const c = centro(huella)
        return (
          <g
            key={e.id}
            data-estructura={e.id}
            className={`capa-estructura__${e.tipo}${elegida ? ' lienzo--seleccionado' : ''}${alPulsar ? ' lienzo--pulsable' : ''}`}
            onPointerDown={manejador(e.id, alPulsar)}
          >
            {e.tipo === 'viga' ? (
              <>
                <polygon className="capa-estructura__contorno" points={puntos(huella)} strokeDasharray="8 5" />
                <text className="lienzo__texto" x={c.x} y={c.y}>{`${textos.lienzo.canto} ${e.canto} cm`}</text>
              </>
            ) : (
              <polygon
                className="capa-estructura__contorno"
                points={puntos(huella)}
                fill={e.tipo === 'columna' ? 'url(#lienzo-rayado)' : undefined}
              />
            )}
          </g>
        )
      })}
    </g>
  )
}
