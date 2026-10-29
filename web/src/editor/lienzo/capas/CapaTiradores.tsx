import type { PointerEvent } from 'react'
import {
  alinearVertice, editarEstructura, escalar, hueco, longitudPared, moverVertice, partirPared, sumar,
  type DocumentoDiseno, type Punto, type Viga,
} from '../../../nucleo'
import { textos } from '../../../textos'
import { almacen, type Seleccion } from '../../estado/almacen'
import { arrastrar, arrastrarPunto } from '../arrastres'
import { usePuntoDelPlano } from '../usarPuntoDelPlano'

interface Props { documento: DocumentoDiseno; seleccion: Seleccion; escala: number }

// Tamaños en px de pantalla: se dividen por la escala para dibujarlos en cm.
const RADIO_VERTICE_PX = 6
const RADIO_MAS_PX = 8
const BRAZO_MAS_PX = 4
/** Distancia del "+" a la cara exterior del muro. */
const SEPARACION_MAS_PX = 14

/** Tiradores del paso 1: vértices arrastrables, "+" para partir cada pared y extremos de la viga seleccionada. */
export default function CapaTiradores({ documento, seleccion, escala }: Props) {
  const aPlano = usePuntoDelPlano()
  const { planta, grosorPared } = documento.estancia
  const px = (n: number) => n / escala

  const pulsarVertice = (i: number) => (ev: PointerEvent<SVGCircleElement>) => {
    ev.stopPropagation()
    almacen.getState().seleccionar({ tipo: 'vertice', indice: i })
    arrastrar(ev, (e) => {
      almacen.getState().intentar((d) => moverVertice(d, i, alinearVertice(d.estancia.planta, i, aPlano(e))), `vertice:${i}`)
    })
  }

  const pulsarMas = (i: number) => (ev: PointerEvent<SVGGElement>) => {
    ev.stopPropagation()
    if (almacen.getState().intentar((d) => partirPared(d, i))) almacen.getState().seleccionar({ tipo: 'vertice', indice: i + 1 })
  }

  const viga = seleccion?.tipo === 'estructura'
    ? documento.estructura.find((e): e is Viga => e.id === seleccion.id && e.tipo === 'viga')
    : undefined
  const pulsarExtremo = (v: Viga, extremo: 'desde' | 'hasta') => (ev: PointerEvent<SVGCircleElement>) => {
    ev.stopPropagation()
    arrastrarPunto(ev, aPlano, v[extremo], `estructura:${v.id}`, (d, p) => editarExtremo(d, v.id, extremo, p))
  }

  return (
    <g className="capa-tiradores">
      {planta.map((_, i) => {
        const h = hueco(planta, i, longitudPared(planta, i) / 2)
        const c = sumar(h.cercano, escalar(h.n, -(grosorPared + px(SEPARACION_MAS_PX))))
        const r = px(BRAZO_MAS_PX)
        return (
          <g key={`mas${i}`} data-partir={i} className="capa-tiradores__mas" onPointerDown={pulsarMas(i)}>
            <title>{textos.lienzo.partir}</title>
            <circle cx={c.x} cy={c.y} r={px(RADIO_MAS_PX)} />
            <line x1={c.x - r} y1={c.y} x2={c.x + r} y2={c.y} />
            <line x1={c.x} y1={c.y - r} x2={c.x} y2={c.y + r} />
          </g>
        )
      })}
      {planta.map((v, i) => (
        <circle
          key={`v${i}`}
          data-vertice={i}
          className={`capa-tiradores__vertice${seleccion?.tipo === 'vertice' && seleccion.indice === i ? ' lienzo--seleccionado' : ''}`}
          cx={v.x}
          cy={v.y}
          r={px(RADIO_VERTICE_PX)}
          onPointerDown={pulsarVertice(i)}
        />
      ))}
      {viga && (['desde', 'hasta'] as const).map((extremo) => (
        <circle
          key={extremo}
          data-extremo={extremo}
          className="capa-tiradores__vertice"
          cx={viga[extremo].x}
          cy={viga[extremo].y}
          r={px(RADIO_VERTICE_PX)}
          onPointerDown={pulsarExtremo(viga, extremo)}
        />
      ))}
    </g>
  )
}

function editarExtremo(d: DocumentoDiseno, id: string, extremo: 'desde' | 'hasta', p: Punto) {
  return editarEstructura(d, id, extremo === 'desde' ? { desde: p } : { hasta: p })
}
