import { catalogoBase, nombreDeElemento, nombreEnPlanta, rectangulo, type Conflicto, type DocumentoDiseno, type Elemento } from '../../../nucleo'
import type { Seleccion } from '../../estado/almacen'
import { esBotonPrincipal, manejador, type AlPulsar } from './comun'
import { colocarNombres, type Etiqueta } from './nombres'
import Pieza from './Pieza'

/** Lado del candado de un bloqueado, en px de pantalla, y su separación de la esquina de la pieza. */
const CANDADO_PX = 14
const MARGEN_CANDADO_PX = 3

/** Candado en la esquina superior izquierda de la caja de la pieza, siempre derecho y del mismo tamaño en pantalla. */
function Candado({ e, escala }: { e: Elemento; escala: number }) {
  const caja = rectangulo(e.posicion, e.medidas.ancho, e.medidas.fondo, e.rotacion)
  const x = Math.min(...caja.map((p) => p.x)), y = Math.min(...caja.map((p) => p.y))
  const k = 1 / escala
  return (
    <g data-candado className="capa-elementos__candado" transform={`translate(${x + MARGEN_CANDADO_PX * k} ${y + MARGEN_CANDADO_PX * k}) scale(${k})`}>
      <rect x={2} y={6} width={CANDADO_PX - 4} height={CANDADO_PX - 7} rx={1.5} />
      <path d={`M4.5 6V4.5a${CANDADO_PX / 2 - 4.5} ${CANDADO_PX / 2 - 4.5} 0 0 1 ${CANDADO_PX - 9} 0V6`} />
    </g>
  )
}

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
        // Un bloqueado se selecciona y deja pasar el toque: así arrastrar desde él hace pan (en el móvil, una cama bloqueada
        // sería una zona muerta) y el Lienzo sabe por `data-bloqueado` que no debe soltar la selección al levantar el dedo.
        const alBajar = e.bloqueado && alPulsar
          ? (ev: Parameters<AlPulsar>[1]) => { if (esBotonPrincipal(ev)) alPulsar(e.id, ev) }
          : manejador(e.id, alPulsar)
        return (
          <g
            key={e.id}
            data-elemento={e.id}
            data-conflicto={enError.has(e.id) ? '' : undefined}
            data-bloqueado={e.bloqueado ? '' : undefined}
            className={`capa-elementos__pieza${elegido ? ' lienzo--seleccionado' : ''}${alPulsar ? ' lienzo--pulsable' : ''}`}
            onPointerDown={alBajar}
          >
            <Pieza def={catalogoBase.get(e.tipo)} e={e} elegido={elegido} />
            {e.bloqueado && <Candado e={e} escala={escala} />}
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
