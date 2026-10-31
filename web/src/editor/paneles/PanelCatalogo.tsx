import { useId, useState, type DragEvent } from 'react'
import { capitalizar, catalogoBase, catalogoDeEstancia, puntoInterior, type DefinicionTipo, type Punto } from '../../nucleo'
import { textos } from '../../textos'
import Icono from '../comunes/Icono'
import { anadirTipo } from '../estado/elementos'
import { useEditor } from '../estado/almacen'
import { MIME_TIPO } from '../lienzo/arrastres'

const t = textos.catalogo

function Grupo({ titulo, tipos, centro }: { titulo: string; tipos: DefinicionTipo[]; centro: Punto }) {
  const id = useId()
  if (tipos.length === 0) return null
  const empezarArrastre = (def: DefinicionTipo) => (ev: DragEvent<HTMLButtonElement>) => {
    ev.dataTransfer.setData(MIME_TIPO, def.id)
    ev.dataTransfer.effectAllowed = 'copy'
  }
  return (
    <section className="panel-catalogo__grupo" aria-labelledby={id}>
      <h2 id={id} className="panel__titulo">{titulo}</h2>
      <ul>
        {tipos.map((def) => (
          <li key={def.id}>
            <button type="button" draggable className="panel-catalogo__tipo"
              onDragStart={empezarArrastre(def)} onClick={() => anadirTipo(def.id, centro)}>
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

/** Paso 2: los tipos del catálogo; pulsar uno lo pone en el centro de la estancia y arrastrarlo, donde se suelte en el plano. */
export default function PanelCatalogo() {
  const estancia = useEditor((e) => e.documento?.estancia)
  const [busqueda, setBusqueda] = useState('')
  const idBuscar = useId()
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
  return (
    <div className="panel-catalogo">
      <div className="panel-catalogo__buscar">
        <label htmlFor={idBuscar} className="solo-lectores">{t.buscar}</label>
        <Icono nombre="buscar" />
        <input id={idBuscar} type="search" placeholder={t.buscar} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>
      <p className="panel__nota">{t.ayuda}</p>
      {grupos.every((g) => g.tipos.length === 0) && <p className="panel__nota" role="status">{t.sinResultados}</p>}
      {grupos.map((g) => <Grupo key={g.titulo} titulo={g.titulo} tipos={g.tipos} centro={centro} />)}
    </div>
  )
}
