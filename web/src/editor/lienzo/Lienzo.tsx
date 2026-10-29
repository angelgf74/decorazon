import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { desplazarPoligono } from '../../nucleo'
import { textos } from '../../textos'
import { useConflictos } from '../estado/conflictos'
import { almacen, useEditor } from '../estado/almacen'
import CapaAberturas from './capas/CapaAberturas'
import CapaConflictos from './capas/CapaConflictos'
import CapaElementos from './capas/CapaElementos'
import CapaEstructura from './capas/CapaEstructura'
import CapaPlanta from './capas/CapaPlanta'
import type { AlPulsar } from './capas/comun'
import { ContextoLienzo } from './usarPuntoDelPlano'
import { encuadrar, zoomEn, type Vista2D } from './vista'
import './lienzo.css'

/** Px que hay que mover el puntero para que un toque en el fondo pase a ser un arrastre. */
const UMBRAL_ARRASTRE_PX = 3
const ZOOM_POR_PX_RUEDA = 0.0015
const PX_POR_LINEA = 16
const VISTA_INICIAL: Vista2D = { x: 0, y: 0, escala: 1 }

interface Arrastre { id: number; x: number; y: number; vista: Vista2D; movido: boolean }

const seleccionarPor = (tipo: 'elemento' | 'abertura' | 'estructura'): AlPulsar =>
  (id) => almacen.getState().seleccionar({ tipo, id })
const pulsarElemento = seleccionarPor('elemento')
const pulsarAbertura = seleccionarPor('abertura')
const pulsarEstructura = seleccionarPor('estructura')

/**
 * Plano 2D en SVG. Todo se dibuja en cm dentro del `<g>` transformado; `children` va encima de las capas,
 * en las mismas coordenadas, para los tiradores de las tareas siguientes (que obtienen el punto con `usePuntoDelPlano`).
 */
export default function Lienzo({ children }: { children?: ReactNode }) {
  const documento = useEditor((e) => e.documento)
  const seleccion = useEditor((e) => e.seleccion)
  const paso = useEditor((e) => e.paso)
  const conflictos = useConflictos()
  const svg = useRef<SVGSVGElement>(null)
  const plano = useRef<SVGGElement>(null)
  const vistaActual = useRef<Vista2D>(VISTA_INICIAL)
  const [vista, setVista] = useState<Vista2D>(VISTA_INICIAL)
  const [arrastrando, setArrastrando] = useState(false)
  const arrastre = useRef<Arrastre | null>(null)
  const contexto = useMemo(() => ({ plano, vista: vistaActual }), [])

  const aplicar = useCallback((f: (v: Vista2D) => Vista2D) => {
    vistaActual.current = f(vistaActual.current)
    setVista(vistaActual.current)
  }, [])

  /** Encuadra la estancia con sus muros; false si el svg aún no tiene tamaño. */
  const encuadrarVista = useCallback((): boolean => {
    const doc = almacen.getState().documento
    const caja = svg.current?.getBoundingClientRect()
    if (!doc || !caja || caja.width === 0 || caja.height === 0) return false
    const { planta, grosorPared } = doc.estancia
    aplicar(() => encuadrar(desplazarPoligono(planta, grosorPared), caja.width, caja.height))
    return true
  }, [aplicar])

  useEffect(() => {
    const el = svg.current
    if (!el) return
    let encuadrado = encuadrarVista()
    const observador = new ResizeObserver(() => {
      if (!encuadrado) encuadrado = encuadrarVista()
    })
    observador.observe(el)
    // React registra la rueda como pasiva: hace falta un oyente propio para poder cancelar el desplazamiento de la página.
    const rueda = (ev: WheelEvent) => {
      ev.preventDefault()
      const caja = el.getBoundingClientRect()
      const delta = ev.deltaMode === 1 ? ev.deltaY * PX_POR_LINEA : ev.deltaY
      aplicar((v) => zoomEn(v, Math.exp(-delta * ZOOM_POR_PX_RUEDA), { x: ev.clientX - caja.left, y: ev.clientY - caja.top }))
    }
    el.addEventListener('wheel', rueda, { passive: false })
    return () => {
      observador.disconnect()
      el.removeEventListener('wheel', rueda)
    }
  }, [aplicar, encuadrarVista])

  // Solo llegan aquí los toques que ninguna capa ha atendido: el fondo.
  const alBajar = (ev: PointerEvent<SVGSVGElement>) => {
    if (ev.button !== 0 && ev.button !== 1) return
    arrastre.current = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, vista: vistaActual.current, movido: false }
    if (typeof ev.currentTarget.setPointerCapture === 'function') ev.currentTarget.setPointerCapture(ev.pointerId)
  }

  const alMover = (ev: PointerEvent<SVGSVGElement>) => {
    const a = arrastre.current
    if (!a || a.id !== ev.pointerId) return
    const dx = ev.clientX - a.x, dy = ev.clientY - a.y
    if (!a.movido && Math.hypot(dx, dy) < UMBRAL_ARRASTRE_PX) return
    if (!a.movido) setArrastrando(true)
    a.movido = true
    aplicar(() => ({ ...a.vista, x: a.vista.x + dx, y: a.vista.y + dy }))
  }

  const alSoltar = (ev: PointerEvent<SVGSVGElement>, cancelado: boolean) => {
    const a = arrastre.current
    if (!a || a.id !== ev.pointerId) return
    arrastre.current = null
    setArrastrando(false)
    if (!a.movido && !cancelado) almacen.getState().seleccionar(null)
  }

  if (!documento) return null

  return (
    <div className="lienzo">
      <svg
        ref={svg}
        className={`lienzo__svg${arrastrando ? ' lienzo__svg--arrastrando' : ''}`}
        role="img"
        aria-label={textos.lienzo.plano}
        onPointerDown={alBajar}
        onPointerMove={alMover}
        onPointerUp={(ev) => alSoltar(ev, false)}
        onPointerCancel={(ev) => alSoltar(ev, true)}
      >
        <defs>
          <pattern id="lienzo-rayado" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#d8d2ca" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#6f6862" strokeWidth="2" />
          </pattern>
        </defs>
        <g ref={plano} transform={`translate(${vista.x} ${vista.y}) scale(${vista.escala})`}>
          <ContextoLienzo.Provider value={contexto}>
            <CapaPlanta documento={documento} />
            <CapaEstructura documento={documento} seleccion={seleccion} vigas={false} alPulsar={paso === 1 ? pulsarEstructura : undefined} />
            <CapaAberturas documento={documento} seleccion={seleccion} alPulsar={paso === 1 ? pulsarAbertura : undefined} />
            <CapaElementos documento={documento} conflictos={conflictos} seleccion={seleccion} alPulsar={paso === 2 ? pulsarElemento : undefined} />
            {/* Las vigas van por el techo: encima de los muebles. */}
            <CapaEstructura documento={documento} seleccion={seleccion} vigas alPulsar={paso === 1 ? pulsarEstructura : undefined} />
            <CapaConflictos conflictos={conflictos} />
            {children}
          </ContextoLienzo.Provider>
        </g>
      </svg>
      <button type="button" className="lienzo__encuadrar" onClick={() => encuadrarVista()}>{textos.lienzo.encuadrar}</button>
    </div>
  )
}
