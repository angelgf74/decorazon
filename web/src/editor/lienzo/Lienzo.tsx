import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent, type ReactNode } from 'react'
import { desplazarPoligono } from '../../nucleo'
import { textos } from '../../textos'
import { useConflictos } from '../estado/conflictos'
import { almacen, useEditor } from '../estado/almacen'
import { anadirTipo } from '../estado/elementos'
import { MIME_TIPO, pulsarAbertura, pulsarElemento, pulsarEstructura, UMBRAL_ARRASTRE_PX, type APlano } from './arrastres'
import CapaAberturas from './capas/CapaAberturas'
import CapaCotas, { CotasElemento } from './capas/CapaCotas'
import CapaConflictos from './capas/CapaConflictos'
import CapaElementos from './capas/CapaElementos'
import CapaEstructura from './capas/CapaEstructura'
import CapaPlanta from './capas/CapaPlanta'
import CapaTiradores, { TiradorGiro } from './capas/CapaTiradores'
import type { AlPulsar } from './capas/comun'
import { ContextoLienzo, puntoDelPlano } from './usarPuntoDelPlano'
import PistasDelPlano from './PistasDelPlano'
import { encuadrar, zoomEn, type Vista2D } from './vista'
import Icono from '../comunes/Icono'
import './lienzo.css'

const ZOOM_POR_PX_RUEDA = 0.0015
const PX_POR_LINEA = 16
const VISTA_INICIAL: Vista2D = { x: 0, y: 0, escala: 1 }

interface Arrastre { id: number; x: number; y: number; vista: Vista2D; movido: boolean }

const pulsarPared = (indice: number) => almacen.getState().seleccionar({ tipo: 'pared', indice })

/**
 * Plano 2D en SVG. Todo se dibuja en cm dentro del `<g>` transformado. En el paso 1 lleva las cotas y los tiradores de la estancia;
 * en el paso 2, los muebles se mueven y giran, y recibe los tipos que se sueltan desde el catálogo.
 * `children` va encima de las capas, en las mismas coordenadas (el punto del puntero sale de `usePuntoDelPlano`).
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
  const [arrastrado, setArrastrado] = useState<string | null>(null)
  const contexto = useMemo(() => ({ plano, vista: vistaActual }), [])
  // Paso 1: pulsar una abertura o una pieza de estructura la selecciona y empieza a arrastrarla.
  const aPlano: APlano = (ev) => puntoDelPlano(contexto, ev)
  const pulsar: Record<'abertura' | 'estructura' | 'elemento', AlPulsar> = {
    abertura: (id, ev) => pulsarAbertura(aPlano, id, ev),
    estructura: (id, ev) => pulsarEstructura(aPlano, id, ev),
    elemento: (id, ev) => pulsarElemento(aPlano, id, ev, setArrastrado),
  }

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

  // Paso 2: un tipo arrastrado desde el catálogo se añade donde se suelta.
  const alPasarPorEncima = (ev: DragEvent<SVGSVGElement>) => {
    if (paso !== 2 || !ev.dataTransfer.types.includes(MIME_TIPO)) return
    ev.preventDefault()
    ev.dataTransfer.dropEffect = 'copy'
  }
  const alSoltarTipo = (ev: DragEvent<SVGSVGElement>) => {
    const tipo = ev.dataTransfer.getData(MIME_TIPO)
    if (paso !== 2 || !tipo) return
    ev.preventDefault()
    anadirTipo(tipo, puntoDelPlano(contexto, ev.nativeEvent))
  }

  if (!documento) return null
  const elegido = seleccion?.tipo === 'elemento' ? documento.elementos.find((e) => e.id === seleccion.id) : undefined
  const enArrastre = arrastrado === null ? undefined : documento.elementos.find((e) => e.id === arrastrado)

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
        onDragOver={alPasarPorEncima}
        onDrop={alSoltarTipo}
      >
        <defs>
          <pattern id="lienzo-rayado" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#d8d2ca" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#6f6862" strokeWidth="2" />
          </pattern>
        </defs>
        {/* --escala deja el texto del plano a tamaño constante en pantalla (lienzo.css). */}
        <g ref={plano} transform={`translate(${vista.x} ${vista.y}) scale(${vista.escala})`} style={{ '--escala': vista.escala } as CSSProperties}>
          <ContextoLienzo.Provider value={contexto}>
            <CapaPlanta documento={documento} seleccion={seleccion} alPulsarPared={paso === 1 ? pulsarPared : undefined} />
            <CapaEstructura documento={documento} seleccion={seleccion} vigas={false} alPulsar={paso === 1 ? pulsar.estructura : undefined} />
            <CapaAberturas documento={documento} seleccion={seleccion} alPulsar={paso === 1 ? pulsar.abertura : undefined} />
            <CapaElementos documento={documento} conflictos={conflictos} seleccion={seleccion} alPulsar={paso === 2 ? pulsar.elemento : undefined} />
            {/* Las vigas van por el techo: encima de los muebles. */}
            <CapaEstructura documento={documento} seleccion={seleccion} vigas alPulsar={paso === 1 ? pulsar.estructura : undefined} />
            <CapaConflictos conflictos={conflictos} />
            {paso === 1 && (
              <>
                <CapaCotas documento={documento} seleccion={seleccion} escala={vista.escala} />
                <CapaTiradores documento={documento} seleccion={seleccion} escala={vista.escala} />
              </>
            )}
            {paso === 2 && enArrastre && <CotasElemento documento={documento} elemento={enArrastre} />}
            {paso === 2 && elegido && <TiradorGiro elemento={elegido} escala={vista.escala} avisar={setArrastrado} />}
            {children}
          </ContextoLienzo.Provider>
        </g>
      </svg>
      <button type="button" className="lienzo__encuadrar" onClick={() => encuadrarVista()}>
        <Icono nombre="encuadrar" /><span className="lienzo__texto-boton">{textos.lienzo.encuadrar}</span>
      </button>
      <PistasDelPlano />
    </div>
  )
}
