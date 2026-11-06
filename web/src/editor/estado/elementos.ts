import { anadirElemento, catalogoBase, duplicarElemento, moverElemento, quitarElemento, type Punto } from '../../nucleo'
import { anotarReciente } from '../paneles/catalogoLocal'
import { almacen } from './almacen'

/** Añade un tipo del catálogo en `posicion` (cm enteros, imantado), lo deja seleccionado y lo apunta como usado hace poco. */
export function anadirTipo(tipo: string, posicion: Punto): void {
  const { documento, cambiar, seleccionar } = almacen.getState()
  if (!documento || !catalogoBase.has(tipo)) return
  const r = anadirElemento(documento, catalogoBase, tipo, { x: Math.round(posicion.x), y: Math.round(posicion.y) })
  cambiar(() => r.documento)
  seleccionar({ tipo: 'elemento', id: r.id })
  anotarReciente(tipo)
}

/** Duplica el elemento y deja seleccionada la copia. */
export function duplicar(id: string): void {
  const { documento, cambiar, seleccionar } = almacen.getState()
  if (!documento) return
  const r = duplicarElemento(documento, catalogoBase, id)
  cambiar(() => r.documento)
  seleccionar({ tipo: 'elemento', id: r.id })
}

export function borrar(id: string): void {
  almacen.getState().cambiar((d) => quitarElemento(d, id))
}

/** Gira 90° en sentido horario (−1: antihorario) y vuelve a imantar, sin enderezar un giro libre. */
export function girar90(id: string, sentido: 1 | -1): void {
  almacen.getState().cambiar((d) => {
    const e = d.elementos.find((x) => x.id === id)
    return e ? moverElemento(d, catalogoBase, id, e.posicion, e.rotacion + 90 * sentido, true) : d
  })
}
