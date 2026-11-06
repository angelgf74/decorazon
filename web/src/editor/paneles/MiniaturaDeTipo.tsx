import { cajaPlanta, elementoNuevo, huellasEnPlanta, type DefinicionTipo, type Elemento } from '../../nucleo'
import Pieza from '../lienzo/capas/Pieza'

/** Aire alrededor de la huella, en cm del plano. */
const MARGEN_CM = 6

interface Miniatura { e: Elemento; viewBox: string }

/** Las medidas por defecto de un tipo no cambian: la miniatura se calcula una vez por tipo. */
const cache = new Map<string, Miniatura>()

function miniatura(def: DefinicionTipo): Miniatura {
  const hecha = cache.get(def.id)
  if (hecha) return hecha
  // En (0, 0) y sin giro: el frente hacia abajo, como al soltarlo en el plano.
  const e = elementoNuevo(def, { x: 0, y: 0 }, `miniatura-${def.id}`)
  const caja = cajaPlanta([...huellasEnPlanta(def, e), ...def.zonasApertura(e).map((z) => z.huella)].flat())
  const viewBox = [caja.minX - MARGEN_CM, caja.minY - MARGEN_CM, caja.maxX - caja.minX + 2 * MARGEN_CM, caja.maxY - caja.minY + 2 * MARGEN_CM].join(' ')
  const m = { e, viewBox }
  cache.set(def.id, m)
  return m
}

/** La huella del tipo con sus medidas por defecto, como se verá en el plano. Decorativa: el nombre va en la tarjeta. */
export default function MiniaturaDeTipo({ def }: { def: DefinicionTipo }) {
  const { e, viewBox } = miniatura(def)
  return (
    <svg className="panel-catalogo__miniatura" viewBox={viewBox} aria-hidden="true" focusable="false">
      <Pieza def={def} e={e} />
    </svg>
  )
}
