import { anadirElemento, catalogoBase, desplazarElemento, duplicarElemento, moverElemento, quitarElemento, type Punto } from '../../nucleo'
import { evento } from '../../analitica'
import { anotarReciente } from '../paneles/catalogoLocal'
import { almacen, type Seleccion } from './almacen'

/** Añade un tipo del catálogo en `posicion` (cm enteros, imantado), lo deja seleccionado y lo apunta como usado hace poco. */
export function anadirTipo(tipo: string, posicion: Punto): void {
  const { documento, cambiar, seleccionar } = almacen.getState()
  if (!documento || !catalogoBase.has(tipo)) return
  const r = anadirElemento(documento, catalogoBase, tipo, { x: Math.round(posicion.x), y: Math.round(posicion.y) })
  cambiar(() => r.documento)
  seleccionar({ tipo: 'elemento', id: r.id })
  anotarReciente(tipo)
  evento('mueble-anadido', { tipo })
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

/** Los muebles seleccionados: ninguno, uno o varios (M-02). */
export function idsSeleccionados(s: Seleccion): string[] {
  if (s?.tipo === 'elemento') return [s.id]
  if (s?.tipo === 'elementos') return s.ids
  return []
}

const seleccionDe = (ids: string[]): Seleccion =>
  ids.length === 0 ? null : ids.length === 1 ? { tipo: 'elemento', id: ids[0]! } : { tipo: 'elementos', ids }

/** Mayúsculas o Ctrl + clic (o el modo «Seleccionar varios» del móvil): añade el mueble a la selección o lo quita. */
export function alternarSeleccion(id: string): void {
  const { seleccion, seleccionar } = almacen.getState()
  const ids = idsSeleccionados(seleccion)
  seleccionar(seleccionDe(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
}

/** Ctrl+A en el paso 2: todos los muebles. */
export function seleccionarTodos(): void {
  const { documento, seleccionar } = almacen.getState()
  seleccionar(seleccionDe(documento?.elementos.map((e) => e.id) ?? []))
}

/** Si algún mueble de la selección está bloqueado: entonces el grupo no se mueve (moverse solo los demás deformaría el conjunto). */
export function grupoConBloqueado(ids: string[]): boolean {
  const doc = almacen.getState().documento
  return ids.some((id) => doc?.elementos.find((e) => e.id === id)?.bloqueado === true)
}

/** Mueve todos los seleccionados (dx, dy) cm, sin imán: el imán movería cada uno por su lado y deformaría el conjunto. Con un bloqueado dentro, nada. */
export function desplazarSeleccion(dx: number, dy: number, grupo?: string): void {
  const { seleccion, cambiar } = almacen.getState()
  const ids = idsSeleccionados(seleccion)
  if (ids.length === 0 || grupoConBloqueado(ids)) return
  cambiar((d) => ids.reduce((doc, id) => desplazarElemento(doc, id, dx, dy), d), grupo)
}

/** Quita todos los seleccionados en un solo paso de deshacer. */
export function borrarSeleccion(): void {
  const { seleccion, cambiar, seleccionar } = almacen.getState()
  const ids = idsSeleccionados(seleccion)
  if (ids.length === 0) return
  cambiar((d) => ids.reduce((doc, id) => quitarElemento(doc, id), d))
  seleccionar(null)
}
