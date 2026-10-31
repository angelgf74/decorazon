import { useState, type PointerEvent } from 'react'
import {
  alinearVertice, editarEstructura, escalar, hueco, longitudPared, moverVertice, partirPared, restar, rotar, sumar, tiradorDeGiro,
  type DocumentoDiseno, type Elemento, type Punto, type Viga,
} from '../../../nucleo'
import { textos } from '../../../textos'
import { almacen, type Seleccion } from '../../estado/almacen'
import { arrastrar, arrastrarPunto, girarElemento, type AlArrastrarElemento } from '../arrastres'
import { usePuntoDelPlano } from '../usarPuntoDelPlano'
import { esBotonPrincipal } from './comun'

interface Props { documento: DocumentoDiseno; seleccion: Seleccion; escala: number }

// Tamaños en px de pantalla: se dividen por la escala para dibujarlos en cm.
const RADIO_VERTICE_PX = 6
const RADIO_MAS_PX = 8
const BRAZO_MAS_PX = 4
/** Distancia del "+" a la cara exterior del muro. */
const SEPARACION_MAS_PX = 14
/** Lo que se aparta el "+" del punto medio a lo largo de la pared, para no tapar el texto de la cota. */
const DESPLAZAMIENTO_MAS_PX = 32

/** Tiradores del paso 1: vértices arrastrables, "+" para partir cada pared y extremos de la viga seleccionada. */
export default function CapaTiradores({ documento, seleccion, escala }: Props) {
  const aPlano = usePuntoDelPlano()
  const { planta, grosorPared } = documento.estancia
  const px = (n: number) => n / escala

  const pulsarVertice = (i: number) => (ev: PointerEvent<SVGCircleElement>) => {
    if (!esBotonPrincipal(ev)) return
    ev.stopPropagation()
    almacen.getState().seleccionar({ tipo: 'vertice', indice: i })
    arrastrar(ev, (e) => {
      almacen.getState().intentar((d) => moverVertice(d, i, alinearVertice(d.estancia.planta, i, aPlano(e))), `vertice:${i}`)
    })
  }

  const pulsarMas = (i: number) => (ev: PointerEvent<SVGGElement>) => {
    if (!esBotonPrincipal(ev)) return
    ev.stopPropagation()
    if (almacen.getState().intentar((d) => partirPared(d, i))) almacen.getState().seleccionar({ tipo: 'vertice', indice: i + 1 })
  }

  const viga = seleccion?.tipo === 'estructura'
    ? documento.estructura.find((e): e is Viga => e.id === seleccion.id && e.tipo === 'viga')
    : undefined
  const pulsarExtremo = (v: Viga, extremo: 'desde' | 'hasta') => (ev: PointerEvent<SVGCircleElement>) => {
    if (!esBotonPrincipal(ev)) return
    ev.stopPropagation()
    arrastrarPunto(ev, aPlano, v[extremo], `estructura:${v.id}`, (d, p) => editarExtremo(d, v.id, extremo, p))
  }

  return (
    <g className="capa-tiradores">
      {planta.map((_, i) => {
        const l = longitudPared(planta, i)
        const h = hueco(planta, i, Math.min(l, l / 2 + px(DESPLAZAMIENTO_MAS_PX)))
        const c = sumar(h.cercano, escalar(h.n, -(grosorPared + px(SEPARACION_MAS_PX))))
        const r = px(BRAZO_MAS_PX)
        return (
          <g key={`mas${i}`} data-partir={i} className="capa-tiradores__mas" onPointerDown={pulsarMas(i)}>
            <title>{textos.lienzo.partir}</title>
            {/* Invisible y del doble de radio: más fácil de acertar, sobre todo con el dedo. */}
            <circle className="capa-tiradores__area" cx={c.x} cy={c.y} r={px(RADIO_MAS_PX * 2)} />
            <circle className="capa-tiradores__boton" cx={c.x} cy={c.y} r={px(RADIO_MAS_PX)} />
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

/** Distancia del tirador de giro al frente del elemento, en cm. */
const SEPARACION_GIRO_CM = 30
const RADIO_GIRO_PX = 7

/** Paso 2: tirador de giro del elemento seleccionado: por delante de su frente o, si ahí no cabe, por detrás o a un lado. */
export function TiradorGiro({ elemento: e, planta, escala, avisar }: { elemento: Elemento; planta: Punto[]; escala: number; avisar: AlArrastrarElemento }) {
  const aPlano = usePuntoDelPlano()
  // Durante el giro el tirador conserva el lado elegido al pulsar (en coordenadas del mueble): si no, saltaría al
  // lado contrario en cuanto el frente quedase libre. Al soltar vuelve a elegir.
  const [fijo, setFijo] = useState<{ local: Punto; desfase: number } | null>(null)
  const elegido = tiradorDeGiro(planta, e, SEPARACION_GIRO_CM)
  const c = fijo === null ? elegido.centro : sumar(e.posicion, rotar(fijo.local, e.rotacion))
  const desfase = fijo?.desfase ?? elegido.desfase
  // El brazo parte del borde de la caja que mira al tirador.
  const local = rotar(restar(c, e.posicion), -e.rotacion)
  const medio = { x: e.medidas.ancho / 2, y: e.medidas.fondo / 2 }
  const borde = sumar(e.posicion, rotar({ x: Math.max(-medio.x, Math.min(medio.x, local.x)), y: Math.max(-medio.y, Math.min(medio.y, local.y)) }, e.rotacion))
  const pulsar = (ev: PointerEvent<SVGCircleElement>) => {
    if (!esBotonPrincipal(ev)) return
    ev.stopPropagation()
    setFijo({ local, desfase })
    girarElemento(aPlano, e.id, ev, (id) => {
      avisar(id)
      if (id === null) setFijo(null)
    }, desfase)
  }
  return (
    <g className="capa-tiradores">
      <line className="capa-tiradores__brazo" x1={borde.x} y1={borde.y} x2={c.x} y2={c.y} />
      <circle data-giro={e.id} className="capa-tiradores__giro" cx={c.x} cy={c.y} r={RADIO_GIRO_PX / escala} onPointerDown={pulsar}>
        <title>{textos.lienzo.girar}</title>
      </circle>
    </g>
  )
}
