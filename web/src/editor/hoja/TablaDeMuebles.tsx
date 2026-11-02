import { catalogoBase, type DocumentoDiseno } from '../../nucleo'
import { textos } from '../../textos'
import { filasDeMuebles } from './hoja'
import './hoja.css'

const t = textos.hoja

/** Lista de muebles del diseño: nombre, medidas, detalles y colores. */
export default function TablaDeMuebles({ doc }: { doc: DocumentoDiseno }) {
  const filas = filasDeMuebles(doc, catalogoBase)
  if (filas.length === 0) return <p>{t.sinMuebles}</p>
  return (
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
  )
}
