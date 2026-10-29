import type { PointerEvent as PointerEventReact } from 'react'
import {
  editarAbertura, editarEstructura, hueco, longitudPared, restar, sumar,
  type DocumentoDiseno, type Punto, type ResultadoEdicion,
} from '../../nucleo'
import { almacen } from '../estado/almacen'

/** Px que hay que mover el puntero para que un toque sobre una pieza pase a ser un arrastre. */
export const UMBRAL_ARRASTRE_PX = 3

export type APlano = (ev: PointerEvent | PointerEventReact) => Punto

const redondear = (p: Punto): Punto => ({ x: Math.round(p.x), y: Math.round(p.y) })

/**
 * Sigue el puntero capturado por la pieza pulsada hasta soltarlo. `alMover` recibe cada movimiento pasado el umbral;
 * al soltar se cierra el grupo de deshacer, para que todo el arrastre sea un solo paso.
 */
export function arrastrar(ev: PointerEventReact<Element>, alMover: (e: PointerEvent) => void): void {
  const el = ev.currentTarget
  const { pointerId, clientX, clientY } = ev
  let movido = false
  if (typeof el.setPointerCapture === 'function') el.setPointerCapture(pointerId)
  const mover = (evento: Event) => {
    const e = evento as PointerEvent
    if (e.pointerId !== pointerId) return
    if (!movido && Math.hypot(e.clientX - clientX, e.clientY - clientY) < UMBRAL_ARRASTRE_PX) return
    movido = true
    alMover(e)
  }
  const soltar = (evento: Event) => {
    if ((evento as PointerEvent).pointerId !== pointerId) return
    el.removeEventListener('pointermove', mover)
    el.removeEventListener('pointerup', soltar)
    el.removeEventListener('pointercancel', soltar)
    if (movido) almacen.getState().terminarGrupo()
  }
  el.addEventListener('pointermove', mover)
  el.addEventListener('pointerup', soltar)
  el.addEventListener('pointercancel', soltar)
}

/** Arrastra un punto entero (un extremo, un centro) siguiendo al puntero desde donde se pulsó. */
export function arrastrarPunto(
  ev: PointerEventReact<Element>, aPlano: APlano, inicio: Punto, grupo: string,
  aplicar: (d: DocumentoDiseno, p: Punto) => ResultadoEdicion,
): void {
  const p0 = aPlano(ev)
  arrastrar(ev, (e) => {
    const p = redondear(sumar(inicio, restar(aPlano(e), p0)))
    almacen.getState().intentar((d) => aplicar(d, p), grupo)
  })
}

/** Lo que avanza `p` a lo largo de la pared, en cm desde su vértice inicial. */
function aLoLargo(planta: Punto[], pared: number, p: Punto): number {
  const { d } = hueco(planta, pared, 0)
  const v = restar(p, planta[pared])
  return v.x * d.x + v.y * d.y
}

/** Posición entera a lo largo de la pared, recortada a [0, L − ancho], al proyectar el puntero sobre el tramo. */
export function posicionEnPared(planta: Punto[], pared: number, ancho: number, posicion0: number, desde: Punto, hasta: Punto): number {
  const delta = aLoLargo(planta, pared, hasta) - aLoLargo(planta, pared, desde)
  const maximo = Math.max(0, Math.floor(longitudPared(planta, pared) - ancho))
  return Math.min(maximo, Math.max(0, Math.round(posicion0 + delta)))
}

type EnPared = { pared: number; posicion: number; ancho: number }

function arrastrarEnPared(ev: PointerEventReact<Element>, aPlano: APlano, h: EnPared, id: string,
  aplicar: (d: DocumentoDiseno, posicion: number) => ResultadoEdicion) {
  const p0 = aPlano(ev)
  arrastrar(ev, (e) => {
    const planta = almacen.getState().documento?.estancia.planta
    if (!planta) return
    const posicion = posicionEnPared(planta, h.pared, h.ancho, h.posicion, p0, aPlano(e))
    almacen.getState().intentar((d) => aplicar(d, posicion), `abertura:${id}`)
  })
}

/** Paso 1: pulsar una abertura la selecciona y empieza a llevarla por su pared. */
export function pulsarAbertura(aPlano: APlano, id: string, ev: PointerEventReact<Element>): void {
  const { documento, seleccionar } = almacen.getState()
  seleccionar({ tipo: 'abertura', id })
  const a = documento?.aberturas.find((x) => x.id === id)
  if (a) arrastrarEnPared(ev, aPlano, a, id, (d, posicion) => editarAbertura(d, id, { posicion }))
}

/** Paso 1: pulsar estructura la selecciona; un radiador va por su pared y una columna se mueve por su centro. */
export function pulsarEstructura(aPlano: APlano, id: string, ev: PointerEventReact<Element>): void {
  const { documento, seleccionar } = almacen.getState()
  seleccionar({ tipo: 'estructura', id })
  const e = documento?.estructura.find((x) => x.id === id)
  if (e?.tipo === 'radiador') arrastrarEnPared(ev, aPlano, e, id, (d, posicion) => editarEstructura(d, id, { posicion }))
  else if (e?.tipo === 'columna') {
    arrastrarPunto(ev, aPlano, e.centro, `estructura:${id}`, (d, centro) => editarEstructura(d, id, { centro }))
  }
  // Una viga se estira por sus extremos, con los tiradores de `CapaTiradores`.
}
