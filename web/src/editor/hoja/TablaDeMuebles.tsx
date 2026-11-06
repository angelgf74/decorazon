import { catalogoBase, type DocumentoDiseno } from '../../nucleo'
import { textos } from '../../textos'
import { formatoPrecio } from '../comunes/formatos'
import { filasDeMuebles, totalAnotado } from './hoja'
import './hoja.css'

const t = textos.hoja

/**
 * Lista de muebles del diseño: nombre, medidas, detalles y colores, y los datos de los productos de tienda. Con
 * `enlaces` (la página compartida) la dirección del producto es un enlace; en papel va en texto, para que se lea.
 */
export default function TablaDeMuebles({ doc, enlaces = false }: { doc: DocumentoDiseno; enlaces?: boolean }) {
  const filas = filasDeMuebles(doc, catalogoBase)
  if (filas.length === 0) return <p>{t.sinMuebles}</p>
  const total = totalAnotado(doc)
  const hayTienda = filas.some((f) => f.tienda !== null)
  return (
    <>
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
              <td>
                <div>{f.nombre}</div>
                {f.tipo && <div className="hoja-impresion__tienda">{f.tipo}</div>}
                {f.tienda && (
                  <div className="hoja-impresion__tienda">
                    <div>{f.tienda.linea}</div>
                    {f.tienda.precio && <div>{f.tienda.precio}</div>}
                    {f.tienda.url && (enlaces
                      ? <a href={f.tienda.url} target="_blank" rel="noopener noreferrer nofollow">{textos.tienda.verEnTienda}</a>
                      : <div className="hoja-impresion__url">{f.tienda.url}</div>)}
                  </div>
                )}
              </td>
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
        {total && (
          <tfoot>
            <tr>
              <td colSpan={4} className="hoja-impresion__total">{textos.tienda.total(formatoPrecio(total.importe), total.productos)}</td>
            </tr>
          </tfoot>
        )}
      </table>
      {total && <p className="hoja-impresion__nota">{textos.tienda.avisoPrecios}</p>}
      {hayTienda && <p className="hoja-impresion__nota">{textos.tienda.marcas}</p>}
    </>
  )
}
