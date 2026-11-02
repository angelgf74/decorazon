import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { desplazarPoligono, type DocumentoDiseno, type Punto } from '../../nucleo'
import { textos } from '../../textos'
import Icono from '../comunes/Icono'
import { PatronRayado } from '../lienzo/capas/CapaEstructura'
import { encuadrar, pellizcar, zoomEn, type Vista2D } from '../lienzo/vista'
import { CapasDelPlano } from './PlanoDelDiseno'
import './hoja.css'

const t = textos.hoja

/** Lo que acercan o alejan los botones de una vez. */
const PASO_ZOOM = 1.25
/** Rueda: cuánto se acerca por cada px de desplazamiento, y px por línea cuando el navegador cuenta líneas. */
const ZOOM_POR_PX_RUEDA = 0.0015
const PX_POR_LINEA = 16

type Gesto =
  | { tipo: 'mover'; id: number; antes: Punto }
  | { tipo: 'pellizcar'; ids: [number, number]; inicio: Vista2D; antes: [Punto, Punto] }

/**
 * El plano a pantalla completa, para mirarlo de cerca: se mueve arrastrando, se acerca pellizcando, con la rueda o
 * con los botones. Aquí el plano se queda todos los gestos; en la página, el dedo desplaza la página.
 */
export default function PlanoAmpliado({ doc, alCerrar }: { doc: DocumentoDiseno; alCerrar(): void }) {
  const idTitulo = useId()
  const dialogo = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const [vista, setVista] = useState<Vista2D | null>(null)
  const toques = useRef(new Map<number, Punto>())
  const gesto = useRef<Gesto | null>(null)

  const tamano = () => {
    const caja = svg.current?.getBoundingClientRect()
    return caja ? { ancho: caja.width, alto: caja.height, izquierda: caja.left, arriba: caja.top } : null
  }
  const encuadrada = useCallback((): Vista2D | null => {
    const caja = svg.current?.getBoundingClientRect()
    if (!caja || caja.width === 0) return null
    return encuadrar(desplazarPoligono(doc.estancia.planta, doc.estancia.grosorPared), caja.width, caja.height)
  }, [doc])

  useEffect(() => dialogo.current?.focus(), [])
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => { if (ev.key === 'Escape') alCerrar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [alCerrar])

  useEffect(() => {
    const el = svg.current
    if (!el) return
    // Se encuadra al medirse (y otra vez si cambia el tamaño, al girar el móvil).
    // oxlint-disable-next-line react/set-state-in-effect
    setVista(encuadrada())
    const observador = new ResizeObserver(() => setVista(encuadrada()))
    observador.observe(el)
    // React registra la rueda como pasiva: hace falta un oyente propio para que no desplace lo de detrás.
    const rueda = (ev: WheelEvent) => {
      ev.preventDefault()
      const caja = el.getBoundingClientRect()
      const delta = ev.deltaMode === 1 ? ev.deltaY * PX_POR_LINEA : ev.deltaY
      setVista((v) => v && zoomEn(v, Math.exp(-delta * ZOOM_POR_PX_RUEDA), { x: ev.clientX - caja.left, y: ev.clientY - caja.top }))
    }
    el.addEventListener('wheel', rueda, { passive: false })
    return () => {
      observador.disconnect()
      el.removeEventListener('wheel', rueda)
    }
  }, [encuadrada])

  const local = (ev: PointerEvent): Punto => {
    const caja = tamano()
    return { x: ev.clientX - (caja?.izquierda ?? 0), y: ev.clientY - (caja?.arriba ?? 0) }
  }

  const alPulsar = (ev: PointerEvent<SVGSVGElement>) => {
    ev.currentTarget.setPointerCapture?.(ev.pointerId)
    toques.current.set(ev.pointerId, local(ev))
    const ids = [...toques.current.keys()]
    if (ids.length === 1) gesto.current = { tipo: 'mover', id: ev.pointerId, antes: local(ev) }
    else if (ids.length === 2 && vista) {
      const par: [number, number] = [ids[0]!, ids[1]!]
      gesto.current = { tipo: 'pellizcar', ids: par, inicio: vista, antes: [toques.current.get(par[0])!, toques.current.get(par[1])!] }
    }
  }

  const alMover = (ev: PointerEvent<SVGSVGElement>) => {
    if (!toques.current.has(ev.pointerId)) return
    const p = local(ev)
    toques.current.set(ev.pointerId, p)
    const g = gesto.current
    if (g?.tipo === 'mover' && g.id === ev.pointerId) {
      const dx = p.x - g.antes.x, dy = p.y - g.antes.y
      g.antes = p
      setVista((v) => v && { ...v, x: v.x + dx, y: v.y + dy })
    } else if (g?.tipo === 'pellizcar') {
      const a = toques.current.get(g.ids[0]), b = toques.current.get(g.ids[1])
      if (a && b) setVista(pellizcar(g.inicio, g.antes, [a, b]))
    }
  }

  const alSoltar = (ev: PointerEvent<SVGSVGElement>) => {
    toques.current.delete(ev.pointerId)
    // Al levantar un dedo del pellizco, el otro sigue moviendo desde donde está.
    const [resto] = [...toques.current.entries()]
    gesto.current = resto ? { tipo: 'mover', id: resto[0], antes: resto[1] } : null
  }

  const zoomCentrado = (factor: number) => {
    const caja = tamano()
    if (caja) setVista((v) => v && zoomEn(v, factor, { x: caja.ancho / 2, y: caja.alto / 2 }))
  }

  return createPortal(
    <div ref={dialogo} className="plano-ampliado" role="dialog" aria-modal="true" aria-labelledby={idTitulo} tabIndex={-1}>
      <div className="plano-ampliado__barra">
        <p id={idTitulo} className="plano-ampliado__titulo">{t.plano}</p>
        <button type="button" className="boton-icono" aria-label={t.acercar} title={t.acercar} onClick={() => zoomCentrado(PASO_ZOOM)}>
          <span aria-hidden="true">+</span>
        </button>
        <button type="button" className="boton-icono" aria-label={t.alejar} title={t.alejar} onClick={() => zoomCentrado(1 / PASO_ZOOM)}>
          <span aria-hidden="true">−</span>
        </button>
        <button type="button" title={t.encuadrar} onClick={() => setVista(encuadrada())}><Icono nombre="encuadrar" /><span className="plano-ampliado__etiqueta">{t.encuadrar}</span></button>
        <button type="button" title={t.cerrar} onClick={alCerrar}><Icono nombre="cerrar" /><span className="plano-ampliado__etiqueta">{t.cerrar}</span></button>
      </div>
      <svg ref={svg} className="plano-ampliado__plano" role="img" aria-label={t.plano}
        onPointerDown={alPulsar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar}>
        <defs><PatronRayado id="ampliado-rayado" /></defs>
        {vista && <CapasDelPlano doc={doc} vista={vista} rayado="ampliado-rayado" />}
      </svg>
    </div>,
    document.body,
  )
}
