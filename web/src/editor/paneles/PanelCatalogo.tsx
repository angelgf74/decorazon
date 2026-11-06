import { useEffect, useId, useRef, useState, type DragEvent, type PointerEvent as PointerEventReact } from 'react'
import { createPortal } from 'react-dom'
import { capitalizar, catalogoBase, catalogoDeEstancia, puntoInterior, type DefinicionTipo, type Punto } from '../../nucleo'
import { textos } from '../../textos'
import Icono from '../comunes/Icono'
import { anadirTipo } from '../estado/elementos'
import { useEditor } from '../estado/almacen'
import { EVENTO_SOLTAR_TIPO, MIME_TIPO, UMBRAL_ARRASTRE_PX, type DetalleSoltarTipo } from '../lienzo/arrastres'
import { alternarFavorito, useCatalogoLocal } from './catalogoLocal'
import MiniaturaDeTipo from './MiniaturaDeTipo'

const t = textos.catalogo

type AlPulsarAsa = (def: DefinicionTipo) => (ev: PointerEventReact<HTMLSpanElement>) => void

interface Fantasma { nombre: string; x: number; y: number }

/**
 * Arrastre con el dedo desde el asa de un tipo (el de HTML5 no funciona con el dedo): un fantasma con el nombre sigue al
 * puntero y, si se suelta sobre el plano, se le despacha `EVENTO_SOLTAR_TIPO`. Si se suelta fuera, se cancela, el catálogo
 * se desmonta o empieza otra pulsación con el mismo puntero sin haber soltado (un arrastre abandonado), nada.
 */
function useArrastreConDedo(alEmpezar?: () => void) {
  const [fantasma, setFantasma] = useState<Fantasma | null>(null)
  const nodo = useRef<HTMLDivElement>(null)
  const enCurso = useRef(false)
  // Cómo dejar cada arrastre en curso (uno por dedo) sin soltar nada: al desmontarse el catálogo.
  const abandonos = useRef(new Set<() => void>())
  useEffect(() => {
    const pendientes = abandonos.current
    return () => pendientes.forEach((abandonar) => abandonar())
  }, [])

  const alPulsarAsa: AlPulsarAsa = (def) => (ev) => {
    if (ev.button !== 0) return
    // Que no lo atienda la tarjeta: el arrastre empieza aquí.
    ev.stopPropagation()
    const el = ev.currentTarget
    const { pointerId, clientX, clientY } = ev
    if (typeof el.setPointerCapture === 'function') el.setPointerCapture(pointerId)
    enCurso.current = true
    // Un toque sin moverse no hace nada: el arrastre (cerrar la hoja, el fantasma) empieza pasado el umbral.
    let movido = false
    const mover = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      if (!movido) {
        if (Math.hypot(e.clientX - clientX, e.clientY - clientY) < UMBRAL_ARRASTRE_PX) return
        movido = true
        setFantasma({ nombre: capitalizar(def.nombre), x: e.clientX, y: e.clientY })
        alEmpezar?.()
        return
      }
      // El fantasma se mueve sin pasar por React, para no repintar el catálogo en cada movimiento.
      nodo.current?.style.setProperty('translate', `${e.clientX}px ${e.clientY}px`)
    }
    const quitarOyentes = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', acabar)
      window.removeEventListener('pointercancel', acabar)
      window.removeEventListener('pointerdown', otraPulsacion, true)
      enCurso.current = false
      abandonos.current.delete(quitarOyentes)
    }
    const acabar = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      quitarOyentes()
      if (!movido) return
      setFantasma(null)
      if (e.type !== 'pointerup') return
      const lienzo = document.elementFromPoint(e.clientX, e.clientY)?.closest('.lienzo__svg')
      const detail: DetalleSoltarTipo = { tipo: def.id, clientX: e.clientX, clientY: e.clientY }
      lienzo?.dispatchEvent(new CustomEvent(EVENTO_SOLTAR_TIPO, { detail }))
    }
    // Si el pointerup nunca llegó (soltado fuera de la ventana sin captura), la siguiente pulsación con el mismo id (el ratón
    // siempre lleva el 1) no debe acabar soltando un mueble que nadie arrastra. Se escucha en la fase de captura: en la de
    // burbuja no llegarían las pulsaciones en un asa o un mueble, que paran la propagación. La que empieza este arrastre
    // ya pasó por esa fase cuando se añade el oyente.
    const otraPulsacion = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      quitarOyentes()
      setFantasma(null)
    }
    // Con el puntero capturado, sus eventos suben desde el asa hasta la ventana.
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', acabar)
    window.addEventListener('pointercancel', acabar)
    window.addEventListener('pointerdown', otraPulsacion, true)
    abandonos.current.add(quitarOyentes)
  }

  // position: fixed dentro de la hoja (que lleva transform) no iría respecto a la pantalla: va en el body.
  const elemento = fantasma && createPortal(
    <div ref={nodo} className="panel-catalogo__fantasma" aria-hidden="true" style={{ translate: `${fantasma.x}px ${fantasma.y}px` }}>
      {fantasma.nombre}
    </div>,
    document.body,
  )
  return { alPulsarAsa, enCurso, fantasma: elemento }
}

interface PropsGrupo {
  titulo: string
  tipos: DefinicionTipo[]
  centro: Punto
  favoritos: string[]
  /** El grupo «Favoritos»: quitar la estrella aquí hace desaparecer la tarjeta (y con ella el foco). */
  esFavoritos?: boolean
  alPulsarAsa: AlPulsarAsa
  /** true mientras se arrastra con el dedo: entonces no empieza el arrastre de HTML5. */
  conDedo: () => boolean
}

/**
 * Antes de quitar un favorito desde «Favoritos»: el foco pasa a la estrella de la tarjeta siguiente del grupo; si era la
 * última, a la estrella del mismo tipo en su grupo de siempre y, si no se enseña (chip «Favoritos» pulsado), al buscador.
 * Si no, al desmontarse la tarjeta el foco caería en `body` y un usuario de teclado volvería al principio de la página.
 */
function enfocarAntesDeQuitar(estrella: HTMLButtonElement, tipo: string): void {
  const siguiente = estrella.closest('li')?.nextElementSibling?.querySelector<HTMLElement>('.panel-catalogo__favorito')
  if (siguiente) {
    siguiente.focus()
    return
  }
  const panel = estrella.closest('.panel-catalogo')
  const deSiempre = [...(panel?.querySelectorAll<HTMLLIElement>('li[data-tipo]') ?? [])]
    .filter((li) => li.dataset['tipo'] === tipo && !li.contains(estrella))
    .map((li) => li.querySelector<HTMLElement>('.panel-catalogo__favorito'))
    .find((b) => b !== null)
  ;(deSiempre ?? panel?.querySelector<HTMLElement>('input[type="search"]'))?.focus()
}

function Grupo({ titulo, tipos, centro, favoritos, esFavoritos = false, alPulsarAsa, conDedo }: PropsGrupo) {
  const id = useId()
  if (tipos.length === 0) return null
  const empezarArrastre = (def: DefinicionTipo) => (ev: DragEvent<HTMLButtonElement>) => {
    if (conDedo()) {
      ev.preventDefault()
      return
    }
    ev.dataTransfer.setData(MIME_TIPO, def.id)
    ev.dataTransfer.effectAllowed = 'copy'
  }
  return (
    <section className="panel-catalogo__grupo" aria-labelledby={id}>
      <h2 id={id} className="panel__titulo">{titulo}</h2>
      <ul className="panel-catalogo__rejilla">
        {tipos.map((def) => {
          const nombre = capitalizar(def.nombre)
          const favorito = favoritos.includes(def.id)
          return (
            <li key={def.id} className="panel-catalogo__tarjeta" data-tipo={def.id}>
              {/* El clic que sigue a soltar el asa no cuenta como pulsar la tarjeta. */}
              <button type="button" draggable className="panel-catalogo__tipo" onDragStart={empezarArrastre(def)}
                onClick={(ev) => { if (!(ev.target as Element).closest('.panel-catalogo__asa')) anadirTipo(def.id, centro) }}>
                <MiniaturaDeTipo def={def} />
                <span className="panel-catalogo__nombre">{nombre}</span>{' '}
                <small>{`${def.medidas.ancho.defecto} × ${def.medidas.fondo.defecto} cm`}</small>
                <span className="panel-catalogo__asa" aria-hidden="true" onPointerDown={alPulsarAsa(def)}>
                  <Icono nombre="mover" />
                </span>
              </button>
              {/* Hermana de la tarjeta, no dentro (un botón dentro de otro no es válido). */}
              <button type="button" className={`panel-catalogo__favorito${favorito ? ' panel-catalogo__favorito--si' : ''}`}
                aria-pressed={favorito} aria-label={t.marcarFavorito(nombre)}
                onClick={(ev) => {
                  if (favorito && esFavoritos) enfocarAntesDeQuitar(ev.currentTarget, def.id)
                  alternarFavorito(def.id)
                }}>
                <Icono nombre="estrella" />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Sin mayúsculas ni tildes: "lampara" encuentra "Lámpara de pie". */
const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

/** Las definiciones de unos ids, en ese orden, saltando los que ya no existan en el catálogo. */
const definiciones = (ids: string[]): DefinicionTipo[] => ids.map((id) => catalogoBase.get(id)).filter((d) => d !== undefined)

const porNombre = (a: DefinicionTipo, b: DefinicionTipo) => a.nombre.localeCompare(b.nombre, 'es')

/**
 * Los recientes que se enseñan: los de verdad, salvo mientras el puntero está sobre el panel. Pulsar una tarjeta cambia
 * los recientes, y si el grupo creciera o se reordenara en ese momento la lista saltaría bajo el puntero y el siguiente
 * clic caería en otro mueble. Se ponen al día al salir el puntero (con el teclado no hace falta: el foco va con la tarjeta).
 */
function useRecientesQuietos(recientes: string[]): { recientes: string[]; onPointerEnter: () => void; onPointerLeave: () => void } {
  const [vistos, setVistos] = useState(recientes)
  const puntero = useRef(false)
  const actuales = useRef(recientes)
  actuales.current = recientes
  useEffect(() => {
    if (!puntero.current) setVistos(recientes)
  }, [recientes])
  return {
    recientes: vistos,
    onPointerEnter: () => { puntero.current = true },
    onPointerLeave: () => {
      puntero.current = false
      setVistos(actuales.current)
    },
  }
}

/**
 * Paso 2: los tipos del catálogo; pulsar uno lo pone en el centro de la estancia y arrastrarlo (con el dedo, por su asa),
 * donde se suelte en el plano. Delante, los favoritos (por nombre) y los usados hace poco (el último, primero), solo si
 * hay alguno. `alEmpezarArrastre` avisa al empezar a arrastrar con el dedo, para cerrar la hoja.
 */
export default function PanelCatalogo({ alEmpezarArrastre }: { alEmpezarArrastre?: () => void }) {
  const estancia = useEditor((e) => e.documento?.estancia)
  const [busqueda, setBusqueda] = useState('')
  // Chip pulsado: solo ese grupo a la vista; sin ninguno, todos.
  const [grupoElegido, setGrupoElegido] = useState<string | null>(null)
  const idBuscar = useId()
  const { alPulsarAsa, enCurso, fantasma } = useArrastreConDedo(alEmpezarArrastre)
  const local = useCatalogoLocal()
  const { recientes, onPointerEnter, onPointerLeave } = useRecientesQuietos(local.recientes)
  const favoritos = local.favoritos
  if (!estancia) return null
  const { deLaEstancia, otros, decoracion } = catalogoDeEstancia(catalogoBase, estancia.tipo)
  const centro = puntoInterior(estancia.planta)
  const buscado = normalizar(busqueda)
  const filtrar = (tipos: DefinicionTipo[]) => tipos.filter((d) => normalizar(d.nombre).includes(buscado))
  const todos = [
    { titulo: t.favoritos, tipos: definiciones(favoritos).sort(porNombre) },
    { titulo: t.recientes, tipos: definiciones(recientes) },
    { titulo: `${t.paraTu} ${t.estancias[estancia.tipo]}`, tipos: deLaEstancia },
    { titulo: t.decoracion, tipos: decoracion },
    { titulo: t.otros, tipos: otros },
  ].filter((g) => g.tipos.length > 0)
  // «Favoritos» puede desaparecer con el chip pulsado (al quitar el último): entonces cuenta como ninguno, todos a la vista.
  const elegido = todos.some((g) => g.titulo === grupoElegido) ? grupoElegido : null
  const grupos = todos
    .filter((g) => elegido === null || g.titulo === elegido)
    .map((g) => ({ ...g, tipos: filtrar(g.tipos) }))
  const conDedo = () => enCurso.current
  return (
    <div className="panel-catalogo" onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
      <div className="panel-catalogo__buscar">
        <label htmlFor={idBuscar} className="solo-lectores">{t.buscar}</label>
        <Icono nombre="buscar" />
        <input id={idBuscar} type="search" placeholder={t.buscar} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>
      <div className="panel-catalogo__chips" role="group" aria-label={t.grupos}>
        {todos.map((g) => (
          <button key={g.titulo} type="button" className="chip" aria-pressed={elegido === g.titulo}
            onClick={() => setGrupoElegido((actual) => (actual === g.titulo ? null : g.titulo))}>
            {g.titulo}
          </button>
        ))}
      </div>
      <p className="panel__nota">{t.ayuda}</p>
      {grupos.every((g) => g.tipos.length === 0) && <p className="panel__nota" role="status">{t.sinResultados}</p>}
      {grupos.map((g) => (
        <Grupo key={g.titulo} titulo={g.titulo} tipos={g.tipos} centro={centro} favoritos={favoritos} esFavoritos={g.titulo === t.favoritos}
          alPulsarAsa={alPulsarAsa} conDedo={conDedo} />
      ))}
      {fantasma}
    </div>
  )
}
