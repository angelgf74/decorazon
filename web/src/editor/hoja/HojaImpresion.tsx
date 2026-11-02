import { lazy, Suspense, useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { cajaPlanta, catalogoBase } from '../../nucleo'
import { textos } from '../../textos'
import Icono from '../comunes/Icono'
import SinFallos from '../comunes/SinFallos'
import { hayWebgl } from '../comunes/webgl'
import { useEditor } from '../estado/almacen'
import CapaAberturas from '../lienzo/capas/CapaAberturas'
import CapaCotas from '../lienzo/capas/CapaCotas'
import CapaElementos from '../lienzo/capas/CapaElementos'
import CapaEstructura, { PatronRayado } from '../lienzo/capas/CapaEstructura'
import CapaPlanta from '../lienzo/capas/CapaPlanta'
import '../lienzo/lienzo.css'
import { filasDeMuebles, marcoDeImpresion } from './hoja'
import './hoja.css'

const t = textos.hoja

// Con three: solo se carga al abrir la hoja.
const Captura3D = lazy(() => import('../vista3d/Captura3D'))

/** Si la vista 3D no llega a capturarse en este tiempo, se imprime sin ella. */
const ESPERA_3D_MS = 8000

type Estado3D = { tipo: 'preparando' } | { tipo: 'lista'; url: string } | { tipo: 'sin3d' }

/**
 * Vista previa de la hoja para imprimir o guardar como PDF: cabecera, plano con cotas y nombres, lista de muebles y,
 * en otra página, la vista 3D. Va directamente en el body: al imprimir se oculta todo lo demás (hoja.css).
 */
export default function HojaImpresion({ alCerrar }: { alCerrar(): void }) {
  const doc = useEditor((e) => e.documento)
  const nombre = useEditor((e) => (e.origen.tipo === 'servidor' ? e.origen.nombre : null))
  const [estado3d, setEstado3d] = useState<Estado3D>(() => (hayWebgl() ? { tipo: 'preparando' } : { tipo: 'sin3d' }))
  const dialogo = useRef<HTMLDivElement>(null)
  const idTitulo = useId()
  const [fecha] = useState(() => new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }))

  useEffect(() => dialogo.current?.focus(), [])
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') alCerrar()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [alCerrar])
  useEffect(() => {
    if (estado3d.tipo !== 'preparando') return
    const id = setTimeout(() => setEstado3d({ tipo: 'sin3d' }), ESPERA_3D_MS)
    return () => clearTimeout(id)
  }, [estado3d.tipo])

  if (doc === null) return null
  const { estancia } = doc
  const caja = cajaPlanta(estancia.planta)
  const { ancho, alto, vista } = marcoDeImpresion(estancia.planta, estancia.grosorPared)
  const filas = filasDeMuebles(doc, catalogoBase)

  return createPortal(
    <div ref={dialogo} className="hoja-impresion" role="dialog" aria-modal="true" aria-labelledby={idTitulo} tabIndex={-1}>
      <div className="hoja-impresion__barra">
        <p id={idTitulo} className="hoja-impresion__titulo">{t.titulo}</p>
        <button type="button" className="primario" disabled={estado3d.tipo === 'preparando'} aria-busy={estado3d.tipo === 'preparando'} onClick={() => window.print()}>
          <Icono nombre="imprimir" />{t.imprimirOPdf}
        </button>
        <button type="button" onClick={alCerrar}><Icono nombre="cerrar" />{t.cerrar}</button>
      </div>

      <article className="hoja-impresion__pagina">
        <header className="hoja-impresion__cabecera">
          <h1>{nombre ?? t.sinNombre}</h1>
          <p className="hoja-impresion__fecha">{fecha}</p>
          <p>{`${textos.nuevaEstancia.tipos[estancia.tipo]} · ${t.dimensiones(Math.round(caja.maxX - caja.minX), Math.round(caja.maxY - caja.minY), estancia.alto)}`}</p>
        </header>

        <svg className="hoja-impresion__plano" viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={t.plano}>
          <defs><PatronRayado id="hoja-rayado" /></defs>
          {/* --escala deja el texto del plano al mismo tamaño que en el editor (lienzo.css). */}
          <g transform={`translate(${vista.x} ${vista.y}) scale(${vista.escala})`} style={{ '--escala': vista.escala } as CSSProperties}>
            <CapaPlanta documento={doc} />
            <CapaEstructura documento={doc} seleccion={null} vigas={false} rayado="hoja-rayado" />
            <CapaAberturas documento={doc} seleccion={null} />
            <CapaElementos documento={doc} conflictos={[]} seleccion={null} />
            <CapaEstructura documento={doc} seleccion={null} vigas rayado="hoja-rayado" />
            <CapaCotas documento={doc} seleccion={null} escala={vista.escala} />
          </g>
        </svg>

        <section className="hoja-impresion__muebles">
          <h2>{t.muebles}</h2>
          {filas.length === 0 ? <p>{t.sinMuebles}</p> : (
            <table className="hoja-impresion__tabla">
              <thead>
                <tr>
                  <th scope="col">{t.columnas.mueble}</th>
                  <th scope="col">{t.columnas.medidas}</th>
                  <th scope="col">{t.columnas.detalles}</th>
                  <th scope="col">{t.columnas.colores}</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.id}>
                    <td>{f.nombre}</td>
                    <td className="hoja-impresion__medidas">{f.medidas}</td>
                    <td>{[f.alturaSuelo, ...f.variantes].filter((d) => d !== null).map((d) => <div key={d}>{d}</div>)}</td>
                    <td>
                      <ul className="hoja-impresion__colores">
                        {f.colores.map((c) => (
                          <li key={c.etiqueta}><span className="hoja-impresion__muestra" style={{ background: c.color }} />{c.etiqueta}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <p className="hoja-impresion__pie">{t.pie}</p>
      </article>

      <article className="hoja-impresion__pagina hoja-impresion__pagina--3d">
        <h2>{t.vista3d}</h2>
        {estado3d.tipo === 'lista' && <img className="hoja-impresion__imagen3d" src={estado3d.url} alt={t.vista3d} />}
        {estado3d.tipo === 'preparando' && <p>{t.preparando3d}</p>}
        {estado3d.tipo === 'sin3d' && <p>{t.sin3d}</p>}
      </article>

      {estado3d.tipo === 'preparando' && (
        <SinFallos alternativa={null} alFallar={() => setEstado3d({ tipo: 'sin3d' })}>
          <Suspense fallback={null}>
            <Captura3D doc={doc} alCapturar={(url) => setEstado3d({ tipo: 'lista', url })} />
          </Suspense>
        </SinFallos>
      )}
    </div>,
    document.body,
  )
}
