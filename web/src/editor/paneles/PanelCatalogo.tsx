import { useId, useRef, useState, type DragEvent, type PointerEvent as PointerEventReact } from 'react'
import { createPortal } from 'react-dom'
import { capitalizar, catalogoBase, catalogoDeEstancia, puntoInterior, type DefinicionTipo, type Punto } from '../../nucleo'
import { textos } from '../../textos'
import Icono from '../comunes/Icono'
import { anadirTipo } from '../estado/elementos'
import { useEditor } from '../estado/almacen'
import { EVENTO_SOLTAR_TIPO, MIME_TIPO, UMBRAL_ARRASTRE_PX, type DetalleSoltarTipo } from '../lienzo/arrastres'

const t = textos.catalogo

type AlPulsarAsa = (def: DefinicionTipo) => (ev: PointerEventReact<HTMLSpanElement>) => void

interface Fantasma { nombre: string; x: number; y: number }

/**
 * Arrastre con el dedo desde el asa de un tipo (el de HTML5 no funciona con el dedo): un fantasma con el nombre sigue al
 * puntero y, si se suelta sobre el plano, se le despacha `EVENTO_SOLTAR_TIPO`. Si se suelta fuera o se cancela, nada.
 */
function useArrastreConDedo(alEmpezar?: () => void) {
  const [fantasma, setFantasma] = useState<Fantasma | null>(null)
  const nodo = useRef<HTMLDivElement>(null)
  const enCurso = useRef(false)

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
    const acabar = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', acabar)
      window.removeEventListener('pointercancel', acabar)
      enCurso.current = false
      if (!movido) return
      setFantasma(null)
      if (e.type !== 'pointerup') return
      const lienzo = document.elementFromPoint(e.clientX, e.clientY)?.closest('.lienzo__svg')
      const detail: DetalleSoltarTipo = { tipo: def.id, clientX: e.clientX, clientY: e.clientY }
      lienzo?.dispatchEvent(new CustomEvent(EVENTO_SOLTAR_TIPO, { detail }))
    }
    // Con el puntero capturado, sus eventos suben desde el asa hasta la ventana.
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', acabar)
    window.addEventListener('pointercancel', acabar)
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
  alPulsarAsa: AlPulsarAsa
  /** true mientras se arrastra con el dedo: entonces no empieza el arrastre de HTML5. */
  conDedo: () => boolean
}

function Grupo({ titulo, tipos, centro, alPulsarAsa, conDedo }: PropsGrupo) {
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
      <ul>
        {tipos.map((def) => (
          <li key={def.id}>
            {/* El clic que sigue a soltar el asa no cuenta como pulsar la tarjeta. */}
            <button type="button" draggable className="panel-catalogo__tipo" onDragStart={empezarArrastre(def)}
              onClick={(ev) => { if (!(ev.target as Element).closest('.panel-catalogo__asa')) anadirTipo(def.id, centro) }}>
              <span className="panel-catalogo__asa" aria-hidden="true" onPointerDown={alPulsarAsa(def)}>
                <Icono nombre="mover" />
              </span>
              <span className="panel-catalogo__texto">
                <span className="panel-catalogo__nombre">{capitalizar(def.nombre)}</span>{' '}
                <small>{`${def.medidas.ancho.defecto} × ${def.medidas.fondo.defecto} cm`}</small>
              </span>
              <Icono nombre="mas" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Sin mayúsculas ni tildes: "lampara" encuentra "Lámpara de pie". */
const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

/**
 * Paso 2: los tipos del catálogo; pulsar uno lo pone en el centro de la estancia y arrastrarlo (con el dedo, por su asa),
 * donde se suelte en el plano. `alEmpezarArrastre` avisa al empezar a arrastrar con el dedo, para cerrar la hoja.
 */
export default function PanelCatalogo({ alEmpezarArrastre }: { alEmpezarArrastre?: () => void }) {
  const estancia = useEditor((e) => e.documento?.estancia)
  const [busqueda, setBusqueda] = useState('')
  const idBuscar = useId()
  const { alPulsarAsa, enCurso, fantasma } = useArrastreConDedo(alEmpezarArrastre)
  if (!estancia) return null
  const { deLaEstancia, otros, decoracion } = catalogoDeEstancia(catalogoBase, estancia.tipo)
  const centro = puntoInterior(estancia.planta)
  const buscado = normalizar(busqueda)
  const filtrar = (tipos: DefinicionTipo[]) => tipos.filter((d) => normalizar(d.nombre).includes(buscado))
  const grupos = [
    { titulo: `${t.paraTu} ${t.estancias[estancia.tipo]}`, tipos: filtrar(deLaEstancia) },
    { titulo: t.decoracion, tipos: filtrar(decoracion) },
    { titulo: t.otros, tipos: filtrar(otros) },
  ]
  const conDedo = () => enCurso.current
  return (
    <div className="panel-catalogo">
      <div className="panel-catalogo__buscar">
        <label htmlFor={idBuscar} className="solo-lectores">{t.buscar}</label>
        <Icono nombre="buscar" />
        <input id={idBuscar} type="search" placeholder={t.buscar} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>
      <p className="panel__nota">{t.ayuda}</p>
      {grupos.every((g) => g.tipos.length === 0) && <p className="panel__nota" role="status">{t.sinResultados}</p>}
      {grupos.map((g) => <Grupo key={g.titulo} titulo={g.titulo} tipos={g.tipos} centro={centro} alPulsarAsa={alPulsarAsa} conDedo={conDedo} />)}
      {fantasma}
    </div>
  )
}
