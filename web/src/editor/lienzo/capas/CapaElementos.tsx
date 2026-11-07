import { useRef, type KeyboardEvent } from 'react'
import { catalogoBase, nombreDeElemento, nombreEnPlanta, rectangulo, type Conflicto, type DocumentoDiseno, type Elemento } from '../../../nucleo'
import type { Seleccion } from '../../estado/almacen'
import { textos } from '../../../textos'
import { hayArrastre } from '../arrastres'
import { esBotonPrincipal, manejador, puntos, type AlPulsar } from './comun'
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

/**
 * `escala`: px de pantalla por cm, para no escribir un nombre encima de otro. Con `alPulsar`, cada pieza tiene además un
 * asa de foco para el teclado (M-28): Tab la alcanza y la selecciona (`alSeleccionar`); sin él (paso 1, midiendo, plano
 * exportado, vista compartida) las piezas son solo dibujo.
 */
interface Props {
  documento: DocumentoDiseno
  conflictos: Conflicto[]
  seleccion: Seleccion
  alPulsar?: AlPulsar
  alSeleccionar?(id: string): void
  /** Mayús+Intro sobre una pieza con el foco: la añade a la selección o la quita (M-02). */
  alAlternar?(id: string, previa: Seleccion): void
  escala?: number
}

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

/** Lo que oye quien recorre el plano con el teclado: nombre entero, medidas y si está bloqueada (con el género del tipo). */
function etiquetaAccesible(e: Elemento): string {
  const def = catalogoBase.get(e.tipo)
  const nombre = `${nombreDeElemento(def, e)} ${e.medidas.ancho} × ${e.medidas.fondo} cm`
  if (!e.bloqueado) return nombre
  return `${nombre}, ${def?.genero === 'f' ? textos.lienzo.bloqueada : textos.lienzo.bloqueado}`
}

const pisable = (e: Elemento) => (catalogoBase.get(e.tipo)?.pisable ? 0 : 1)

/**
 * Orden de tabulación: alfombras primero (se pintan debajo) y, dentro, por posición (arriba-abajo, izquierda-derecha). Es
 * SOLO el de las asas de foco: el orden de pintado de las piezas no cambia con la posición, porque reordenar el DOM en
 * mitad de un arrastre haría que el navegador soltara la captura del puntero y el arrastre se cortaría.
 */
function ordenDeTabulacion(elementos: Elemento[]): Elemento[] {
  return [...elementos].sort((a, b) => pisable(a) - pisable(b) || a.posicion.y - b.posicion.y || a.posicion.x - b.posicion.x)
}

export default function CapaElementos({ documento, conflictos, seleccion, alPulsar, alSeleccionar, alAlternar, escala = 1 }: Props) {
  const enError = new Set(conflictos.filter((c) => c.gravedad === 'error').flatMap((c) => c.ids.slice(0, 2)))
  // Lo pisable (alfombras) debajo del resto; lo demás, en el orden en que se añadió (el último, encima).
  const orden = [...documento.elementos].sort((a, b) => pisable(a) - pisable(b))
  // Con varios seleccionados (M-02), todos llevan halo.
  const elegido = (e: Elemento) => (seleccion?.tipo === 'elemento' && seleccion.id === e.id) || (seleccion?.tipo === 'elementos' && seleccion.ids.includes(e.id))
  // Tab selecciona lo que alcanza (así Supr, R y las flechas actúan sobre lo que se ve con el foco); Intro y Espacio, por si acaso.
  // A mitad de un arrastre con el puntero no se cambia la selección: el arrastre sigue con su pieza.
  const seleccionar = (id: string) => { if (!hayArrastre()) alSeleccionar?.(id) }
  // Con varios seleccionados, recorrer con Tab no deshace el grupo: el foco solo se mueve (Intro sí elige una sola).
  // La selección de antes de que el foco eligiera la pieza: Mayús+Intro alterna sobre ella (si no, quitaría lo que el foco
  // acaba de seleccionar y con el teclado no se podría formar un grupo).
  const previa = useRef<Seleccion>(seleccion)
  const alEnfocar = (id: string) => {
    previa.current = seleccion
    if (seleccion?.tipo !== 'elementos') seleccionar(id)
  }
  const alTeclear = (id: string) => (ev: KeyboardEvent<SVGPolygonElement>) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return
    ev.preventDefault()
    if (ev.shiftKey && ev.key === 'Enter') alAlternar?.(id, previa.current)
    else seleccionar(id)
  }
  return (
    <g className="capa-elementos">
      {orden.map((e) => {
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
            className={`capa-elementos__pieza${elegido(e) ? ' lienzo--seleccionado' : ''}${alPulsar ? ' lienzo--pulsable' : ''}`}
            onPointerDown={alBajar}
          >
            <Pieza def={catalogoBase.get(e.tipo)} e={e} elegido={elegido(e)} />
            {e.bloqueado && <Candado e={e} escala={escala} />}
          </g>
        )
      })}
      {/* Los nombres, por encima de todas las piezas: lo que está bajo una mesa no tapa el suyo. Al lector ya se los da el asa. */}
      <g className="capa-elementos__nombres" aria-hidden="true">
        {colocarNombres(orden.map(etiqueta).filter((x) => x !== null), escala).map(({ id, nombre, punto }) => (
          <text key={id} className="lienzo__texto" x={punto.x} y={punto.y}>{nombre}</text>
        ))}
      </g>
      {/* Las asas de foco (M-28): la caja de cada pieza, sin relleno ni puntero, en el orden de tabulación. */}
      {alPulsar && (
        <g className="capa-elementos__asas">
          {ordenDeTabulacion(documento.elementos).map((e) => (
            <polygon
              key={e.id}
              data-foco={e.id}
              className="capa-elementos__foco"
              points={puntos(rectangulo(e.posicion, e.medidas.ancho, e.medidas.fondo, e.rotacion))}
              tabIndex={0}
              role="button"
              aria-label={etiquetaAccesible(e)}
              aria-current={elegido(e) ? 'true' : undefined}
              onFocus={() => alEnfocar(e.id)}
              onKeyDown={alTeclear(e.id)}
            />
          ))}
        </g>
      )}
    </g>
  )
}
