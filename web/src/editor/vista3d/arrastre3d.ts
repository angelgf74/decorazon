import { Plane, Vector3, type Ray } from 'three'
import { catalogoBase, moverElemento, type Punto } from '../../nucleo'
import { almacen } from '../estado/almacen'

/**
 * Mover muebles en 3D (M-10): el puntero se proyecta sobre el suelo y el mueble se mueve lo que se movió ese punto, con el
 * mismo imán que en 2D. Girar sigue siendo solo en 2D. Solo se arrastra el mueble ya seleccionado: así, empezar a
 * arrastrar sobre cualquier otro mueble sigue girando la cámara.
 */

const SUELO = new Plane(new Vector3(0, 1, 0), 0)

/** Dónde corta el rayo al suelo, en cm del plano (x de la escena → x; z → y), o null si no lo corta. */
export function puntoDelSuelo(rayo: Ray): Punto | null {
  const p = rayo.intersectPlane(SUELO, new Vector3())
  return p === null ? null : { x: Math.round(p.x * 100), y: Math.round(p.z * 100) }
}

export function sePuedeArrastrarEn3D(id: string): boolean {
  const e = almacen.getState()
  if (e.paso !== 2 || e.seleccion?.tipo !== 'elemento' || e.seleccion.id !== id) return false
  return e.documento?.elementos.find((x) => x.id === id)?.bloqueado !== true
}

/** El mueble que estaba en `partida` va a `partida + (hasta − desde)`, imantado; los movimientos de un arrastre, un solo deshacer. */
export function moverEn3D(id: string, partida: Punto, desde: Punto, hasta: Punto): void {
  const destino = { x: partida.x + hasta.x - desde.x, y: partida.y + hasta.y - desde.y }
  almacen.getState().cambiar((d) => {
    const e = d.elementos.find((x) => x.id === id)
    return e ? moverElemento(d, catalogoBase, id, destino, e.rotacion, e.rotacion % 90 !== 0) : d
  }, `mover:${id}`)
}
