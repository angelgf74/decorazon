import { catalogoBase, huellasEnPlanta, nombreEnPlanta, rectangulo, type Conflicto, type DocumentoDiseno, type Elemento } from '../../../nucleo'
import type { Seleccion } from '../../estado/almacen'
import { manejador, puntos, type AlPulsar } from './comun'

interface Props { documento: DocumentoDiseno; conflictos: Conflicto[]; seleccion: Seleccion; alPulsar?: AlPulsar }

/** Por debajo de este ancho no se escribe el nombre. */
const ANCHO_NOMBRE_CM = 40
const COLOR_SIN_ZONA = '#d8d2ca'

function Pieza({ e, elegido }: { e: Elemento; elegido: boolean }) {
  const def = catalogoBase.get(e.tipo)
  const huellas = def ? huellasEnPlanta(def, e) : [rectangulo(e.posicion, e.medidas.ancho, e.medidas.fondo, e.rotacion)]
  const zona = def?.zonasColor[0]
  const relleno = zona ? (e.colores[zona.clave] ?? zona.defecto) : COLOR_SIN_ZONA
  return (
    <>
      {/* La selección es un halo por debajo: el contorno rojo de un conflicto sigue a la vista. */}
      {elegido && huellas.map((h, i) => <polygon key={`h${i}`} className="capa-elementos__halo" points={puntos(h)} />)}
      {huellas.map((h, i) => <polygon key={i} className="capa-elementos__huella" points={puntos(h)} fill={relleno} />)}
      {def?.zonasApertura(e).map((z, i) => (
        <polygon key={`a${i}`} className="capa-elementos__apertura" points={puntos(z.huella)} strokeDasharray="6 4" />
      ))}
    </>
  )
}

function Nombre({ e }: { e: Elemento }) {
  if (e.medidas.ancho <= ANCHO_NOMBRE_CM) return null
  const def = catalogoBase.get(e.tipo)
  const nombre = def ? def.nombre.charAt(0).toUpperCase() + def.nombre.slice(1) : e.tipo
  const { x, y } = def ? nombreEnPlanta(def, e) : e.posicion
  return <text className="lienzo__texto" x={x} y={y}>{nombre}</text>
}

export default function CapaElementos({ documento, conflictos, seleccion, alPulsar }: Props) {
  const enError = new Set(conflictos.filter((c) => c.gravedad === 'error').flatMap((c) => c.ids.slice(0, 2)))
  // Lo pisable (alfombras) debajo del resto.
  const pisable = (e: Elemento) => (catalogoBase.get(e.tipo)?.pisable ? 0 : 1)
  const orden = [...documento.elementos].sort((a, b) => pisable(a) - pisable(b))
  return (
    <g className="capa-elementos">
      {orden.map((e) => {
        const elegido = seleccion?.tipo === 'elemento' && seleccion.id === e.id
        return (
          <g
            key={e.id}
            data-elemento={e.id}
            data-conflicto={enError.has(e.id) ? '' : undefined}
            className={`capa-elementos__pieza${elegido ? ' lienzo--seleccionado' : ''}${alPulsar ? ' lienzo--pulsable' : ''}`}
            onPointerDown={manejador(e.id, alPulsar)}
          >
            <Pieza e={e} elegido={elegido} />
          </g>
        )
      })}
      {/* Los nombres, por encima de todas las piezas: lo que está bajo una mesa no tapa el suyo. */}
      <g className="capa-elementos__nombres">
        {orden.map((e) => <Nombre key={e.id} e={e} />)}
      </g>
    </g>
  )
}
