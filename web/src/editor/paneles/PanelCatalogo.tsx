import { useId, type DragEvent } from 'react'
import { cajaPlanta, capitalizar, catalogoBase, catalogoDeEstancia, type DefinicionTipo, type Punto } from '../../nucleo'
import { textos } from '../../textos'
import { anadirTipo } from '../estado/elementos'
import { useEditor } from '../estado/almacen'
import { MIME_TIPO } from '../lienzo/arrastres'

const t = textos.catalogo

function centroDeCaja(planta: Punto[]): Punto {
  const c = cajaPlanta(planta)
  return { x: (c.minX + c.maxX) / 2, y: (c.minY + c.maxY) / 2 }
}

function Grupo({ titulo, tipos, centro }: { titulo: string; tipos: DefinicionTipo[]; centro: Punto }) {
  const id = useId()
  if (tipos.length === 0) return null
  const empezarArrastre = (def: DefinicionTipo) => (ev: DragEvent<HTMLButtonElement>) => {
    ev.dataTransfer.setData(MIME_TIPO, def.id)
    ev.dataTransfer.effectAllowed = 'copy'
  }
  return (
    <section className="panel-catalogo__grupo" aria-labelledby={id}>
      <h2 id={id}>{titulo}</h2>
      <ul>
        {tipos.map((def) => (
          <li key={def.id}>
            <button type="button" draggable className="panel-catalogo__tipo"
              onDragStart={empezarArrastre(def)} onClick={() => anadirTipo(def.id, centro)}>
              <span>{capitalizar(def.nombre)}</span>{' '}
              <small>{`${def.medidas.ancho.defecto} × ${def.medidas.fondo.defecto} cm`}</small>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Paso 2: los tipos del catálogo; pulsar uno lo pone en el centro de la estancia y arrastrarlo, donde se suelte en el plano. */
export default function PanelCatalogo() {
  const estancia = useEditor((e) => e.documento?.estancia)
  if (!estancia) return null
  const { deLaEstancia, otros, decoracion } = catalogoDeEstancia(catalogoBase, estancia.tipo)
  const centro = centroDeCaja(estancia.planta)
  return (
    <div className="panel-catalogo">
      <p className="panel__nota">{t.ayuda}</p>
      <Grupo titulo={`${t.paraTu} ${t.estancias[estancia.tipo]}`} tipos={deLaEstancia} centro={centro} />
      <Grupo titulo={t.decoracion} tipos={decoracion} centro={centro} />
      <Grupo titulo={t.otros} tipos={otros} centro={centro} />
    </div>
  )
}
