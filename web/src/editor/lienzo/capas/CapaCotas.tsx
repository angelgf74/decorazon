import type { PointerEvent } from 'react'
import {
  catalogoBase, cotasAParedes, cotasEnPared, escalar, hueco, imantar, longitudPared, rectangulo, sumar, type DocumentoDiseno, type Elemento,
} from '../../../nucleo'
import { almacen, type Seleccion } from '../../estado/almacen'
import { esBotonPrincipal } from './comun'

interface Props { documento: DocumentoDiseno; seleccion: Seleccion; escala: number }

/** Distancia en px de pantalla de la línea de cota a la cara exterior del muro. */
const SEPARACION_COTA_PX = 34

/** Cota de longitud de cada pared, por fuera del muro; pulsarla selecciona la pared. */
export default function CapaCotas({ documento, seleccion, escala }: Props) {
  const { planta, grosorPared } = documento.estancia
  const fuera = grosorPared + SEPARACION_COTA_PX / escala

  const pulsar = (i: number) => (ev: PointerEvent<SVGGElement>) => {
    if (!esBotonPrincipal(ev)) return
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

/** Paso 2, mientras se arrastra un elemento: su distancia a las paredes y, resaltadas, las paredes a las que se pega. */
export function CotasElemento({ documento, elemento: e }: { documento: DocumentoDiseno; elemento: Elemento }) {
  const { planta } = documento.estancia
  const cotas = cotasAParedes(planta, rectangulo(e.posicion, e.medidas.ancho, e.medidas.fondo, e.rotacion))
  const { pegadoA } = imantar(documento, catalogoBase, e, { libre: e.rotacion % 90 !== 0 })
  const paredes = pegadoA.filter((p) => p.startsWith('pared:')).map((p) => Number(p.slice('pared:'.length)))
  return (
    <g className="capa-cotas capa-cotas--elemento">
      {paredes.map((i) => {
        const a = planta[i], b = planta[(i + 1) % planta.length]
        return a && b ? <line key={`p${i}`} data-pared-pegada={i} className="capa-cotas__pegada" x1={a.x} y1={a.y} x2={b.x} y2={b.y} /> : null
      })}
      {cotas.map((c, i) => {
        const m = escalar(sumar(c.desde, c.hasta), 0.5)
        return (
          <g key={i} data-cota-elemento={i} className="capa-cotas__cota">
            <line x1={c.desde.x} y1={c.desde.y} x2={c.hasta.x} y2={c.hasta.y} />
            <text className="lienzo__texto" x={m.x} y={m.y}>{`${c.valor} cm`}</text>
          </g>
        )
      })}
    </g>
  )
}

/** Distancia en px de pantalla de la cota a la cara interior del muro. */
const SEPARACION_EN_PARED_PX = 20

/** Paso 1: lo que separa del resto de la pared a la puerta, ventana o radiador seleccionado; también durante su arrastre. */
export function CotasEnPared({ documento, seleccion, escala }: Props) {
  if (seleccion?.tipo !== 'abertura' && seleccion?.tipo !== 'estructura') return null
  const id = seleccion.id
  const e = seleccion.tipo === 'abertura' ? documento.aberturas.find((a) => a.id === id) : documento.estructura.find((s) => s.id === id)
  if (!e || e.tipo === 'columna' || e.tipo === 'viga') return null
  const { planta } = documento.estancia
  const dentro = escalar(hueco(planta, e.pared, 0).n, SEPARACION_EN_PARED_PX / escala)
  return (
    <g className="capa-cotas capa-cotas--elemento">
      {cotasEnPared(planta, e.pared, e.posicion, e.ancho).map((c, i) => {
        const a = sumar(c.desde, dentro), b = sumar(c.hasta, dentro)
        const m = escalar(sumar(a, b), 0.5)
        return (
          <g key={i} data-cota-en-pared={i} className="capa-cotas__cota capa-cotas--elemento">
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            <text className="lienzo__texto" x={m.x} y={m.y}>{`${c.valor} cm`}</text>
          </g>
        )
      })}
    </g>
  )
}
