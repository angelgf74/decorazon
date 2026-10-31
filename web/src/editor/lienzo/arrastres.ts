import type { PointerEvent as PointerEventReact } from 'react'
import {
  catalogoBase, editarAbertura, editarEstructura, hueco, longitudPared, moverElemento, restar, sumar,
  type DocumentoDiseno, type Punto, type ResultadoEdicion,
} from '../../nucleo'
import { almacen } from '../estado/almacen'

/** Px que hay que mover el puntero para que un toque sobre una pieza pase a ser un arrastre. */
export const UMBRAL_ARRASTRE_PX = 3

/** Tipo de `dataTransfer` con el que el catálogo arrastra un tipo de elemento al plano. */
export const MIME_TIPO = 'application/x-decorazon-tipo'

export type APlano = (ev: PointerEvent | PointerEventReact) => Punto

let enCurso = false

/** true mientras una pieza sigue al puntero: los atajos que editan esperan a que se suelte. */
export const hayArrastre = (): boolean => enCurso

const redondear = (p: Punto): Punto => ({ x: Math.round(p.x), y: Math.round(p.y) })

/**
 * Sigue el puntero capturado por la pieza pulsada hasta soltarlo. `alMover` recibe cada movimiento pasado el umbral;
 * al soltar se cierra el grupo de deshacer, para que todo el arrastre sea un solo paso, y se llama a `alSoltar`.
 */
export function arrastrar(ev: PointerEventReact<Element>, alMover: (e: PointerEvent) => void, alSoltar?: () => void): void {
  const el = ev.currentTarget
  const { pointerId, clientX, clientY } = ev
  let movido = false
  enCurso = true
  if (typeof el.setPointerCapture === 'function') el.setPointerCapture(pointerId)
  const mover = (evento: Event) => {
    const e = evento as PointerEvent
    if (e.pointerId !== pointerId) return
    if (!movido && Math.hypot(e.clientX - clientX, e.clientY - clientY) < UMBRAL_ARRASTRE_PX) return
    movido = true
    alMover(e)
  }
  // Perder la captura (otra ventana roba el puntero…) también suelta. Si la pieza se desmonta a mitad (Escape quita
  // el tirador), sus eventos ya no llegan: la ventana y el documento también escuchan, y el cierre solo actúa una vez.
  const finales = ['pointerup', 'pointercancel', 'lostpointercapture'] as const
  const enVentana = ['pointerup', 'pointercancel'] as const
  let cerrado = false
  const soltar = (evento: Event) => {
    if (cerrado || (evento as PointerEvent).pointerId !== pointerId) return
    cerrado = true
    el.removeEventListener('pointermove', mover)
    for (const tipo of finales) el.removeEventListener(tipo, soltar)
    for (const tipo of enVentana) window.removeEventListener(tipo, soltar)
    document.removeEventListener('lostpointercapture', soltar)
    enCurso = false
    if (movido) almacen.getState().terminarGrupo()
    alSoltar?.()
  }
  el.addEventListener('pointermove', mover)
  for (const tipo of finales) el.addEventListener(tipo, soltar)
  for (const tipo of enVentana) window.addEventListener(tipo, soltar)
  document.addEventListener('lostpointercapture', soltar)
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

/** Avisa de qué elemento se está arrastrando (null al soltar), para dibujar sus cotas. */
export type AlArrastrarElemento = (id: string | null) => void

/** Paso 2: pulsar un elemento lo selecciona y empieza a moverlo; el imán actúa en cada movimiento. */
export function pulsarElemento(aPlano: APlano, id: string, ev: PointerEventReact<Element>, avisar: AlArrastrarElemento): void {
  const { documento, seleccionar } = almacen.getState()
  seleccionar({ tipo: 'elemento', id })
  const e = documento?.elementos.find((x) => x.id === id)
  if (!e) return
  const p0 = aPlano(ev)
  arrastrar(ev, (m) => {
    avisar(id)
    const p = redondear(sumar(e.posicion, restar(aPlano(m), p0)))
    // Un giro libre se conserva; uno de 90° en 90° se sigue imantando así.
    almacen.getState().cambiar((d) => moverElemento(d, catalogoBase, id, p, e.rotacion, e.rotacion % 90 !== 0), `mover:${id}`)
  }, () => avisar(null))
}

/** Giro, en grados, que deja el frente (+y local) mirando desde `centro` hacia `p`. */
export function giroHacia(centro: Punto, p: Punto): number {
  const v = restar(p, centro)
  return (Math.atan2(-v.x, v.y) * 180) / Math.PI
}

/**
 * Paso 2: el tirador de giro orienta el elemento hacia el puntero, de 90° en 90° o, con Mayúsculas, libre.
 * `desfase` es el ángulo del tirador respecto al frente (0 si está delante), para que agarrarlo no gire la pieza.
 */
export function girarElemento(aPlano: APlano, id: string, ev: PointerEventReact<Element>, avisar: AlArrastrarElemento, desfase = 0): void {
  const e = almacen.getState().documento?.elementos.find((x) => x.id === id)
  if (!e) return
  arrastrar(ev, (m) => {
    avisar(id)
    const angulo = giroHacia(e.posicion, aPlano(m)) - desfase
    const libre = m.shiftKey
    const giro = libre ? Math.round(angulo) : Math.round(angulo / 90) * 90
    almacen.getState().cambiar((d) => moverElemento(d, catalogoBase, id, e.posicion, ((giro % 360) + 360) % 360, libre), `girar:${id}`)
  }, () => avisar(null))
}
