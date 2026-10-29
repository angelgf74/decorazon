import { describe, expect, it } from 'vitest'
import { anadirElemento, documentoNuevo, catalogoBase, type DocumentoDiseno } from '../../nucleo'
import { crearAlmacen, HISTORIAL_MAXIMO } from './almacen'

const mover = (x: number) => (d: DocumentoDiseno): DocumentoDiseno => ({ ...d, estancia: { ...d.estancia, alto: x } })

describe('almacén del editor', () => {
  it('crear deja documento e historial vacío', () => {
    const a = crearAlmacen()
    a.getState().crear('salon', 400, 300, 250)
    expect(a.getState().documento).toEqual(documentoNuevo('salon', 400, 300, 250))
    expect(a.getState().pasado).toEqual([])
    expect(a.getState().paso).toBe(1)
  })

  it('deshace y rehace', () => {
    const a = crearAlmacen()
    a.getState().crear('salon', 400, 300, 250)
    a.getState().cambiar(mover(1))
    a.getState().cambiar(mover(2))
    a.getState().deshacer()
    expect(a.getState().documento?.estancia.alto).toBe(1)
    a.getState().rehacer()
    expect(a.getState().documento?.estancia.alto).toBe(2)
  })

  it('un arrastre de 60 movimientos se deshace de una vez', () => {
    const a = crearAlmacen()
    a.getState().crear('salon', 400, 300, 250)
    for (let i = 1; i <= 60; i++) a.getState().cambiar(mover(i), 'mover:x')
    a.getState().terminarGrupo()
    expect(a.getState().pasado).toHaveLength(1)
    a.getState().deshacer()
    expect(a.getState().documento?.estancia.alto).toBe(250)
  })

  it('limita el historial', () => {
    const a = crearAlmacen()
    a.getState().crear('salon', 400, 300, 250)
    for (let i = 1; i <= 105; i++) a.getState().cambiar(mover(i))
    expect(a.getState().pasado).toHaveLength(HISTORIAL_MAXIMO)
  })

  it('intentar rechazado pone aviso y no cambia el documento', () => {
    const a = crearAlmacen()
    a.getState().crear('salon', 400, 300, 250)
    const antes = a.getState().documento
    expect(a.getState().intentar(() => ({ ok: false, motivo: 'm' }))).toBe(false)
    expect(a.getState().aviso).toBe('m')
    expect(a.getState().documento).toBe(antes)
    expect(a.getState().intentar((d) => ({ ok: true, documento: mover(7)(d) }))).toBe(true)
    expect(a.getState().aviso).toBeNull()
  })

  it('cambiar con el mismo objeto no hace nada', () => {
    const a = crearAlmacen()
    a.getState().crear('salon', 400, 300, 250)
    a.getState().cambiar((d) => d)
    expect(a.getState().pasado).toEqual([])
  })

  it('anula la selección de un elemento que desaparece al deshacer', () => {
    const a = crearAlmacen()
    a.getState().crear('salon', 400, 300, 250)
    let id = ''
    a.getState().cambiar((d) => {
      const r = anadirElemento(d, catalogoBase, 'cama', { x: 100, y: 100 })
      id = r.id
      return r.documento
    })
    a.getState().seleccionar({ tipo: 'elemento', id })
    expect(a.getState().seleccion).not.toBeNull()
    a.getState().deshacer()
    expect(a.getState().seleccion).toBeNull()
  })

  it('anula una selección de vértice fuera de rango', () => {
    const a = crearAlmacen()
    a.getState().crear('salon', 400, 300, 250)
    a.getState().seleccionar({ tipo: 'vertice', indice: 3 })
    a.getState().cambiar(mover(1))
    expect(a.getState().seleccion).toEqual({ tipo: 'vertice', indice: 3 })
    a.getState().seleccionar({ tipo: 'pared', indice: 9 })
    a.getState().cambiar(mover(2))
    expect(a.getState().seleccion).toBeNull()
  })

  it('redondea los números al cambiar', () => {
    const a = crearAlmacen()
    a.getState().crear('salon', 400, 300, 250)
    a.getState().cambiar((d) => ({
      ...d,
      estancia: { ...d.estancia, planta: d.estancia.planta.map((p, i) => (i === 0 ? { x: 1e-17, y: 0 } : p)) },
    }))
    expect(a.getState().documento?.estancia.planta[0]?.x).toBe(0)
    expect(Object.is(a.getState().documento?.estancia.planta[0]?.x, 0)).toBe(true)
  })

  it('descartar vacía todo', () => {
    const a = crearAlmacen()
    a.getState().crear('salon', 400, 300, 250)
    a.getState().cambiar(mover(1))
    a.getState().descartar()
    expect(a.getState().documento).toBeNull()
    expect(a.getState().pasado).toEqual([])
  })
})
