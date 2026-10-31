import type { Conflicto, DocumentoDiseno } from '../../nucleo'
import { textos } from '../../textos'
import { almacen, useEditor, type Paso, type Seleccion } from '../estado/almacen'
import { useConflictos } from '../estado/conflictos'
import Icono from '../comunes/Icono'

const t = textos.avisos

function destino(id: string | undefined, doc: DocumentoDiseno): { paso: Paso; seleccion: Seleccion } | null {
  if (id === undefined) return null
  if (id.startsWith('pared:')) return { paso: 1, seleccion: { tipo: 'pared', indice: Number(id.slice('pared:'.length)) } }
  if (doc.elementos.some((e) => e.id === id)) return { paso: 2, seleccion: { tipo: 'elemento', id } }
  if (doc.aberturas.some((a) => a.id === id)) return { paso: 1, seleccion: { tipo: 'abertura', id } }
  if (doc.estructura.some((x) => x.id === id)) return { paso: 1, seleccion: { tipo: 'estructura', id } }
  return null
}

function ir(c: Conflicto): void {
  const { documento, irAPaso, seleccionar } = almacen.getState()
  if (documento === null) return
  const d = destino(c.ids[0], documento)
  if (d === null) return
  irAPaso(d.paso)
  seleccionar(d.seleccion)
}

/** Los errores primero y después los avisos; pulsar uno lleva al paso y a la pieza afectada. */
export default function ListaAvisos() {
  const conflictos = useConflictos()
  const hayDocumento = useEditor((e) => e.documento !== null)
  if (!hayDocumento) return null
  const ordenados = [
    ...conflictos.filter((c) => c.gravedad === 'error'),
    ...conflictos.filter((c) => c.gravedad === 'aviso'),
  ]
  return (
    <section className={`lista-avisos${ordenados.length > 0 ? ' lista-avisos--con-avisos' : ''}`} aria-label={t.titulo}>
      <h2>{`${t.titulo} (${ordenados.length})`}</h2>
      {ordenados.length === 0 ? (
        <p className="lista-avisos__bien"><Icono nombre="hecho" />{t.todoBien}</p>
      ) : (
        <ul>
          {ordenados.map((c, i) => (
            <li key={`${c.tipo}-${c.ids.join('|')}-${i}`}>
              <button type="button" className="lista-avisos__aviso" onClick={() => ir(c)}>
                <span className={`lista-avisos__punto${c.gravedad === 'aviso' ? ' lista-avisos__punto--aviso' : ''}`} aria-hidden="true" />
                <span>{c.mensaje}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
