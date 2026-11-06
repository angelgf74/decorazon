import { useEffect, useRef, useState } from 'react'
import type { Conflicto, DocumentoDiseno } from '../../nucleo'
import { textos } from '../../textos'
import Icono from '../comunes/Icono'
import { useDesplegable } from '../comunes/usarDesplegable'
import { almacen, useEditor, type Paso, type Seleccion } from '../estado/almacen'
import { useConflictos } from '../estado/conflictos'

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

/** Cuánto espera el anuncio al lector de pantalla: un arrastre cambia los avisos muchas veces seguidas y solo cuenta el final. */
const RETARDO_ANUNCIO_MS = 600

/**
 * Texto para el lector de pantalla: el número de avisos cuando lleva `RETARDO_ANUNCIO_MS` sin cambiar. Un número que no cambia
 * no se vuelve a anunciar (mover un mueble que sigue en conflicto no dice nada nuevo) y lo que ya había al abrir tampoco: se
 * compara con el último valor visto, lo que también resiste el doble efecto de StrictMode.
 */
function useAnuncio(n: number): string {
  const [anuncio, setAnuncio] = useState('')
  const anterior = useRef(n)
  useEffect(() => {
    if (n === anterior.current) return
    anterior.current = n
    const id = setTimeout(() => setAnuncio(n === 0 ? t.todoBien : textos.barra.avisos(n)), RETARDO_ANUNCIO_MS)
    return () => clearTimeout(id)
  }, [n])
  return anuncio
}

/**
 * Chip sobre el plano, arriba a la izquierda, en las dos vistas: verde si todo cabe; si no, cuántos avisos hay y, al
 * pulsarlo, la lista con los errores primero. Elegir uno lleva al paso y a la pieza afectada y cierra la lista.
 */
export default function AvisosDelPlano() {
  const conflictos = useConflictos()
  const hayDocumento = useEditor((e) => e.documento !== null)
  const { abierto, alternar, cerrar, raiz, disparador, alTeclear } = useDesplegable()
  const anuncio = useAnuncio(conflictos.length)
  if (!hayDocumento) return null
  const ordenados = [
    ...conflictos.filter((c) => c.gravedad === 'error'),
    ...conflictos.filter((c) => c.gravedad === 'aviso'),
  ]

  // Sin role="status" en el chip: cambia a cada arrastre y anunciarlo cada vez sería ruido (y el estado de guardado ya es el
  // status de la barra). El lector de pantalla recibe el número con retardo por la región aria-live oculta, que va siempre
  // en el mismo sitio del árbol para que React no la recree al cambiar de chip (una región nueva puede leerse o perderse).
  return (
    <>
      <p className="solo-lectores" aria-live="polite">{anuncio}</p>
      {ordenados.length === 0
        ? <p className="avisos__chip avisos__chip--bien"><Icono nombre="hecho" />{t.todoBien}</p>
        : <ListaDeAvisos ordenados={ordenados} abierto={abierto} alternar={alternar} cerrar={cerrar} raiz={raiz} disparador={disparador} alTeclear={alTeclear} />}
    </>
  )
}

type PropsLista = { ordenados: Conflicto[] } & ReturnType<typeof useDesplegable<HTMLDivElement>>

function ListaDeAvisos({ ordenados, abierto, alternar, cerrar, raiz, disparador, alTeclear }: PropsLista) {
  return (
    <div ref={raiz} className="avisos" onKeyDown={alTeclear}>
      <button ref={disparador} type="button" className="avisos__chip avisos__chip--mal" aria-expanded={abierto} onClick={alternar}>
        <Icono nombre="aviso" />{textos.barra.avisos(ordenados.length)}
      </button>
      {abierto && (
        <section className="lista-avisos" aria-label={t.titulo}>
          <ul>
            {ordenados.map((c, i) => (
              <li key={`${c.tipo}-${c.ids.join('|')}-${i}`}>
                <button type="button" className="lista-avisos__aviso" onClick={() => { cerrar(); ir(c) }}>
                  <span className={`lista-avisos__punto${c.gravedad === 'aviso' ? ' lista-avisos__punto--aviso' : ''}`} aria-hidden="true" />
                  <span>{c.mensaje}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
