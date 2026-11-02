import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent, type ReactNode } from 'react'
import { desplazarPoligono, type Punto } from '../../nucleo'
import { textos } from '../../textos'
import { useConflictos } from '../estado/conflictos'
import { almacen, useEditor } from '../estado/almacen'
import { anadirTipo } from '../estado/elementos'
import { cortarArrastre, EVENTO_SOLTAR_TIPO, MIME_TIPO, pulsarAbertura, pulsarElemento, pulsarEstructura, UMBRAL_ARRASTRE_PX, type APlano, type DetalleSoltarTipo } from './arrastres'
import CapaAberturas from './capas/CapaAberturas'
import CapaCotas, { CotasElemento, CotasEnPared } from './capas/CapaCotas'
import CapaConflictos from './capas/CapaConflictos'
import CapaElementos from './capas/CapaElementos'
import CapaEstructura, { PatronRayado } from './capas/CapaEstructura'
import CapaPlanta from './capas/CapaPlanta'
import CapaTiradores, { TiradorGiro } from './capas/CapaTiradores'
import type { AlPulsar } from './capas/comun'
import { ContextoLienzo, puntoDelPlano } from './usarPuntoDelPlano'
import PistasDelPlano from './PistasDelPlano'
import { encuadrar, pellizcar, zoomEn, type Vista2D } from './vista'
import Icono from '../comunes/Icono'
import './lienzo.css'

const ZOOM_POR_PX_RUEDA = 0.0015
const PX_POR_LINEA = 16
const VISTA_INICIAL: Vista2D = { x: 0, y: 0, escala: 1 }

interface Arrastre { id: number; x: number; y: number; vista: Vista2D; movido: boolean }
interface Pellizco { inicio: Vista2D; antes: [Punto, Punto] }

/** Los dos primeros dedos: los del pellizco. */
function dosToques(toques: Map<number, Punto>): [Punto, Punto] {
  const [a, b] = toques.values()
  return [a!, b!]
}

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
  // Dedos sobre el plano, en px del svg, caigan donde caigan; con dos, pellizco.
  const toques = useRef(new Map<number, Punto>())
  const pellizco = useRef<Pellizco | null>(null)
  // Mientras no se mueva a mano, al cambiar el tamaño (abrir una hoja en el móvil) se vuelve a encuadrar.
  const movidaAMano = useRef(false)
  const tamano = useRef({ ancho: 0, alto: 0 })
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
    movidaAMano.current = false
    tamano.current = { ancho: caja.width, alto: caja.height }
    return true
  }, [aplicar])

  useEffect(() => {
    const el = svg.current
    if (!el) return
    let encuadrado = encuadrarVista()
    const observador = new ResizeObserver(() => {
      if (!encuadrado || !movidaAMano.current) {
        encuadrado = encuadrarVista()
        return
      }
      // Movido a mano: se conserva lo que había en el centro.
      const caja = el.getBoundingClientRect()
      const antes = tamano.current
      tamano.current = { ancho: caja.width, alto: caja.height }
      aplicar((v) => ({ ...v, x: v.x + (caja.width - antes.ancho) / 2, y: v.y + (caja.height - antes.alto) / 2 }))
    })
    observador.observe(el)
    // React registra la rueda como pasiva: hace falta un oyente propio para poder cancelar el desplazamiento de la página.
    const rueda = (ev: WheelEvent) => {
      ev.preventDefault()
      const caja = el.getBoundingClientRect()
      const delta = ev.deltaMode === 1 ? ev.deltaY * PX_POR_LINEA : ev.deltaY
      movidaAMano.current = true
      aplicar((v) => zoomEn(v, Math.exp(-delta * ZOOM_POR_PX_RUEDA), { x: ev.clientX - caja.left, y: ev.clientY - caja.top }))
    }
    el.addEventListener('wheel', rueda, { passive: false })
    return () => {
      observador.disconnect()
      el.removeEventListener('wheel', rueda)
    }
  }, [aplicar, encuadrarVista])

  // Paso 2: lo mismo que `alSoltarTipo`, para el tipo que el catálogo arrastra con el dedo desde su asa.
  useEffect(() => {
    const el = svg.current
    if (!el) return
    const soltar = (ev: Event) => {
      const detalle = (ev as CustomEvent<DetalleSoltarTipo>).detail
      if (almacen.getState().paso === 2) anadirTipo(detalle.tipo, puntoDelPlano(contexto, detalle))
    }
    el.addEventListener(EVENTO_SOLTAR_TIPO, soltar)
    return () => el.removeEventListener(EVENTO_SOLTAR_TIPO, soltar)
  }, [contexto])

  // Un dedo que se levanta deja de contar aunque se suelte fuera del plano; con uno solo, el pellizco acaba.
  useEffect(() => {
    const quitar = (ev: globalThis.PointerEvent) => {
      if (!toques.current.delete(ev.pointerId) || !pellizco.current) return
      pellizco.current = toques.current.size >= 2 ? { inicio: vistaActual.current, antes: dosToques(toques.current) } : null
    }
    window.addEventListener('pointerup', quitar, true)
    window.addEventListener('pointercancel', quitar, true)
    return () => {
      window.removeEventListener('pointerup', quitar, true)
      window.removeEventListener('pointercancel', quitar, true)
    }
  }, [])

  const enSvg = (ev: PointerEvent<SVGSVGElement>): Punto => {
    const caja = ev.currentTarget.getBoundingClientRect()
    return { x: ev.clientX - caja.left, y: ev.clientY - caja.top }
  }

  // En captura: ven todos los dedos, también los que caen en una pieza.
  const alBajarCualquiera = (ev: PointerEvent<SVGSVGElement>) => {
    toques.current.set(ev.pointerId, enSvg(ev))
    if (toques.current.size < 2) return
    // Desde el segundo dedo no se pulsa nada: los dos primeros amplían y desplazan el plano.
    ev.stopPropagation()
    if (pellizco.current) return
    for (const id of toques.current.keys()) if (id !== ev.pointerId) cortarArrastre(id)
    arrastre.current = null
    setArrastrando(false)
    if (typeof ev.currentTarget.setPointerCapture === 'function') ev.currentTarget.setPointerCapture(ev.pointerId)
    pellizco.current = { inicio: vistaActual.current, antes: dosToques(toques.current) }
  }

  const alMoverCualquiera = (ev: PointerEvent<SVGSVGElement>) => {
    if (!toques.current.has(ev.pointerId)) return
    toques.current.set(ev.pointerId, enSvg(ev))
    const p = pellizco.current
    if (!p) return
    ev.stopPropagation()
    movidaAMano.current = true
    aplicar(() => pellizcar(p.inicio, p.antes, dosToques(toques.current)))
  }

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
    movidaAMano.current = true
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
        onPointerDownCapture={alBajarCualquiera}
        onPointerMoveCapture={alMoverCualquiera}
        onPointerDown={alBajar}
        onPointerMove={alMover}
        onPointerUp={(ev) => alSoltar(ev, false)}
        onPointerCancel={(ev) => alSoltar(ev, true)}
        onDragOver={alPasarPorEncima}
        onDrop={alSoltarTipo}
      >
        <defs><PatronRayado id="lienzo-rayado" /></defs>
        {/* --escala deja el texto del plano a tamaño constante en pantalla (lienzo.css). */}
        <g ref={plano} transform={`translate(${vista.x} ${vista.y}) scale(${vista.escala})`} style={{ '--escala': vista.escala } as CSSProperties}>
          <ContextoLienzo.Provider value={contexto}>
            <CapaPlanta documento={documento} seleccion={seleccion} alPulsarPared={paso === 1 ? pulsarPared : undefined} />
            <CapaEstructura documento={documento} seleccion={seleccion} vigas={false} alPulsar={paso === 1 ? pulsar.estructura : undefined} />
            <CapaAberturas documento={documento} seleccion={seleccion} alPulsar={paso === 1 ? pulsar.abertura : undefined} />
            <CapaElementos documento={documento} conflictos={conflictos} seleccion={seleccion} alPulsar={paso === 2 ? pulsar.elemento : undefined} escala={vista.escala} />
            {/* Las vigas van por el techo: encima de los muebles. */}
            <CapaEstructura documento={documento} seleccion={seleccion} vigas alPulsar={paso === 1 ? pulsar.estructura : undefined} />
            <CapaConflictos conflictos={conflictos} />
            {paso === 1 && (
              <>
                <CapaCotas documento={documento} seleccion={seleccion} escala={vista.escala} />
                <CotasEnPared documento={documento} seleccion={seleccion} escala={vista.escala} />
                <CapaTiradores documento={documento} seleccion={seleccion} escala={vista.escala} />
              </>
            )}
            {paso === 2 && enArrastre && <CotasElemento documento={documento} elemento={enArrastre} />}
            {paso === 2 && elegido && <TiradorGiro elemento={elegido} planta={documento.estancia.planta} escala={vista.escala} avisar={setArrastrado} />}
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
