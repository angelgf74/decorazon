import type { PointerEvent } from 'react'
import { escalar, hueco, longitudPared, sumar, type DocumentoDiseno } from '../../../nucleo'
import { almacen, type Seleccion } from '../../estado/almacen'

interface Props { documento: DocumentoDiseno; seleccion: Seleccion; escala: number }

/** Distancia en px de pantalla de la línea de cota a la cara exterior del muro. */
const SEPARACION_COTA_PX = 34

/** Cota de longitud de cada pared, por fuera del muro; pulsarla selecciona la pared. */
export default function CapaCotas({ documento, seleccion, escala }: Props) {
  const { planta, grosorPared } = documento.estancia
  const fuera = grosorPared + SEPARACION_COTA_PX / escala

  const pulsar = (i: number) => (ev: PointerEvent<SVGGElement>) => {
    ev.stopPropagation()
    almacen.getState().seleccionar({ tipo: 'pared', indice: i })
  }

  return (
    <g className="capa-cotas">
      {planta.map((_, i) => {
        const l = longitudPared(planta, i)
        const h = hueco(planta, i, 0)
        const a = sumar(h.cercano, escalar(h.n, -fuera))
        const b = sumar(a, escalar(h.d, l))
        const m = sumar(a, escalar(h.d, l / 2))
        const elegida = seleccion?.tipo === 'pared' && seleccion.indice === i
        return (
          <g key={i} data-cota={i} className={`capa-cotas__cota${elegida ? ' lienzo--seleccionado' : ''}`} onPointerDown={pulsar(i)}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            <text className="lienzo__texto" x={m.x} y={m.y}>{`${Math.round(l)} cm`}</text>
          </g>
        )
      })}
    </g>
  )
}
