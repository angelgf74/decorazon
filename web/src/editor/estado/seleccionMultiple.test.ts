import { beforeEach, describe, expect, it } from 'vitest'
import { bloquearElemento, catalogoBase, elementoNuevo } from '../../nucleo'
import { almacen, reiniciarAlmacen } from './almacen'
import { alternarSeleccion, borrarSeleccion, desplazarSeleccion, idsSeleccionados, seleccionarTodos } from './elementos'

const colocar = (tipo: string, id: string, x: number, y: number) =>
  almacen.getState().cambiar((d) => ({ ...d, elementos: [...d.elementos, elementoNuevo(catalogoBase.get(tipo)!, { x, y }, id)] }))
const pos = (id: string) => almacen.getState().documento!.elementos.find((e) => e.id === id)?.posicion

beforeEach(() => {
  reiniciarAlmacen()
  almacen.getState().crear('salon', 500, 400, 250)
  almacen.getState().irAPaso(2)
  colocar('mesa', 'mesa', 250, 200)
  colocar('silla', 's1', 250, 150)
  colocar('silla', 's2', 250, 250)
})

describe('selección de varios muebles (M-02)', () => {
  it('alternar añade y quita: uno, dos, y al quitar vuelve a uno', () => {
    alternarSeleccion('mesa')
    expect(almacen.getState().seleccion).toEqual({ tipo: 'elemento', id: 'mesa' })
    alternarSeleccion('s1')
    expect(almacen.getState().seleccion).toEqual({ tipo: 'elementos', ids: ['mesa', 's1'] })
    alternarSeleccion('s2')
    expect(idsSeleccionados(almacen.getState().seleccion)).toEqual(['mesa', 's1', 's2'])
    alternarSeleccion('mesa')
    alternarSeleccion('s1')
    expect(almacen.getState().seleccion).toEqual({ tipo: 'elemento', id: 's2' })
    alternarSeleccion('s2')
    expect(almacen.getState().seleccion).toBeNull()
  })

  it('una selección de varios es del paso 2 y se valida con el documento: lo borrado sale, y si queda uno pasa a ser uno', () => {
    seleccionarTodos()
    expect(idsSeleccionados(almacen.getState().seleccion)).toEqual(['mesa', 's1', 's2'])
    almacen.getState().cambiar((d) => ({ ...d, elementos: d.elementos.filter((e) => e.id !== 's2' && e.id !== 's1') }))
    almacen.getState().seleccionar(almacen.getState().seleccion)
    expect(almacen.getState().seleccion).toEqual({ tipo: 'elemento', id: 'mesa' })
    seleccionarTodos()
    almacen.getState().irAPaso(1)
    expect(almacen.getState().seleccion).toBeNull()
  })

  it('mover el grupo desplaza todos a la vez, sin imán, en un solo paso de deshacer; un bloqueado no se mueve', () => {
    almacen.getState().cambiar((d) => bloquearElemento(d, 's2', true))
    seleccionarTodos()
    const pasos = almacen.getState().pasado.length
    desplazarSeleccion(3, 1, 'teclado:grupo')
    desplazarSeleccion(3, 1, 'teclado:grupo')
    almacen.getState().terminarGrupo()
    expect(pos('mesa')).toEqual({ x: 256, y: 202 })
    expect(pos('s1')).toEqual({ x: 256, y: 152 })
    expect(pos('s2')).toEqual({ x: 250, y: 250 })
    expect(almacen.getState().pasado.length).toBe(pasos + 1)
  })

  it('borrar el grupo quita todos en un solo deshacer y suelta la selección', () => {
    seleccionarTodos()
    const pasos = almacen.getState().pasado.length
    borrarSeleccion()
    expect(almacen.getState().documento!.elementos).toHaveLength(0)
    expect(almacen.getState().seleccion).toBeNull()
    expect(almacen.getState().pasado.length).toBe(pasos + 1)
    almacen.getState().deshacer()
    expect(almacen.getState().documento!.elementos).toHaveLength(3)
  })

  it('seleccionarTodos con un solo mueble lo deja seleccionado a él; sin muebles, nada', () => {
    almacen.getState().cambiar((d) => ({ ...d, elementos: d.elementos.slice(0, 1) }))
    seleccionarTodos()
    expect(almacen.getState().seleccion).toEqual({ tipo: 'elemento', id: 'mesa' })
    almacen.getState().cambiar((d) => ({ ...d, elementos: [] }))
    seleccionarTodos()
    expect(almacen.getState().seleccion).toBeNull()
  })
})
