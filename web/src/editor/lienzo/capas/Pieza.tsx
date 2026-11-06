import { huellasEnPlanta, rectangulo, type DefinicionTipo, type Elemento } from '../../../nucleo'
import { puntos } from './comun'

const COLOR_SIN_ZONA = '#d8d2ca'

/**
 * Las huellas y aperturas de una pieza, con el color de su primera zona. La usan el plano (`CapaElementos`) y la miniatura
 * del catálogo (`MiniaturaDeTipo`): lo que se ve en la tarjeta es lo que se verá en el plano. Sin `def` (un tipo que ya no
 * existe), un rectángulo con sus medidas.
 */
export default function Pieza({ def, e, elegido = false }: { def: DefinicionTipo | undefined; e: Elemento; elegido?: boolean }) {
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
