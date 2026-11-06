import { catalogoBase, nombreDeElemento, nombreEnPlanta, type Conflicto, type DocumentoDiseno, type Elemento } from '../../../nucleo'
import type { Seleccion } from '../../estado/almacen'
import { manejador, type AlPulsar } from './comun'
import { colocarNombres, type Etiqueta } from './nombres'
import Pieza from './Pieza'

/** `escala`: px de pantalla por cm, para no escribir un nombre encima de otro. */
interface Props { documento: DocumentoDiseno; conflictos: Conflicto[]; seleccion: Seleccion; alPulsar?: AlPulsar; escala?: number }

/** Por debajo de este ancho no se escribe el nombre. */
const ANCHO_NOMBRE_CM = 40
/** El nombre de un producto puede ser largo («PAX armario blanco con puertas…»): en el plano se recorta; entero, en la lista. */
const LETRAS_NOMBRE_PLANO = 20

function recortar(nombre: string): string {
  return nombre.length > LETRAS_NOMBRE_PLANO ? `${nombre.slice(0, LETRAS_NOMBRE_PLANO - 1).trimEnd()}…` : nombre
}
/** El nombre de la pieza y dónde va; null si es demasiado estrecha para escribirlo. */
function etiqueta(e: Elemento): Etiqueta | null {
  if (e.medidas.ancho <= ANCHO_NOMBRE_CM) return null
  const def = catalogoBase.get(e.tipo)
  const nombre = recortar(nombreDeElemento(def, e))
  return { id: e.id, nombre, punto: def ? nombreEnPlanta(def, e) : e.posicion, altura: e.alturaSuelo }
}

export default function CapaElementos({ documento, conflictos, seleccion, alPulsar, escala = 1 }: Props) {
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
            <Pieza def={catalogoBase.get(e.tipo)} e={e} elegido={elegido} />
          </g>
        )
      })}
      {/* Los nombres, por encima de todas las piezas: lo que está bajo una mesa no tapa el suyo. */}
      <g className="capa-elementos__nombres">
        {colocarNombres(orden.map(etiqueta).filter((x) => x !== null), escala).map(({ id, nombre, punto }) => (
          <text key={id} className="lienzo__texto" x={punto.x} y={punto.y}>{nombre}</text>
        ))}
      </g>
    </g>
  )
}
