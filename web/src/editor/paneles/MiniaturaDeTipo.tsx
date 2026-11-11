import { memo, useState } from 'react'
import { cajaPlanta, elementoNuevo, huellasEnPlanta, type DefinicionTipo, type Elemento } from '../../nucleo'
import Pieza from '../lienzo/capas/Pieza'
import { MINIATURAS } from './miniaturas.generado'

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
function Huella({ def }: { def: DefinicionTipo }) {
  const { e, viewBox } = miniatura(def)
  return (
    <svg className="panel-catalogo__miniatura" viewBox={viewBox} aria-hidden="true" focusable="false">
      <Pieza def={def} e={e} />
    </svg>
  )
}

/**
 * El mueble en 3D, generado de antemano por `npm run miniaturas` (`public/miniaturas/<id>.webp`). El resumen de sus bytes
 * va en la URL: si la imagen cambia, cambia la URL y ni el navegador ni el service worker sirven la vieja. Sin imagen (un tipo nuevo aún sin
 * generar) o si no carga (sin conexión y sin caché), la huella. Decorativa; `draggable={false}`: el arrastre es el de la tarjeta.
 */
function MiniaturaDeTipo({ def }: { def: DefinicionTipo }) {
  const [fallo, setFallo] = useState(false)
  const imagen = MINIATURAS[def.id]
  if (!imagen || fallo) return <Huella def={def} />
  return (
    <img className="panel-catalogo__miniatura" src={`/miniaturas/${def.id}.webp?v=${imagen.contenido}`} alt=""
      width={imagen.ancho} height={imagen.alto} loading="lazy" decoding="async" draggable={false} onError={() => setFallo(true)} />
  )
}

// `def` es una referencia estable del catálogo: con memo, escribir en el buscador o pulsar una estrella no vuelve a pintar las ~60 miniaturas.
export default memo(MiniaturaDeTipo)
