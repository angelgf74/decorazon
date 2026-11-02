import { describe, expect, it } from 'vitest'
import { anadirElemento, documentoNuevo, catalogoBase, type DocumentoDiseno } from '../../nucleo'
import { CLAVE_DISENO } from '../persistencia/local'
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

  it('cambiar un mueble conserva la referencia de los demás: la 3D no los vuelve a calcular', () => {
    const a = crearAlmacen()
    a.getState().crear('salon', 400, 300, 250)
    a.getState().cambiar((d) => anadirElemento(d, catalogoBase, 'sofa', { x: 100, y: 100 }).documento)
    a.getState().cambiar((d) => anadirElemento(d, catalogoBase, 'sofa', { x: 300, y: 200 }).documento)
    const antes = a.getState().documento!
    const dos = antes.elementos[1]!.id
    a.getState().cambiar((d) => ({ ...d, elementos: d.elementos.map((e) => (e.id === dos ? { ...e, posicion: { x: 250.123, y: 200 } } : e)) }))
    const despues = a.getState().documento!
    expect(despues.elementos[0]).toBe(antes.elementos[0])
    expect(despues.estancia).toBe(antes.estancia)
    expect(despues.elementos[1]!.posicion).toEqual({ x: 250.12, y: 200 })
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

  it('irAPaso anula la selección que no es del paso nuevo', () => {
    const a = crearAlmacen()
    a.getState().crear('salon', 400, 300, 250)
    const r = anadirElemento(a.getState().documento!, catalogoBase, 'mesa', { x: 200, y: 150 })
    a.getState().cambiar(() => r.documento)
    a.getState().seleccionar({ tipo: 'vertice', indice: 1 })
    a.getState().irAPaso(1)
    expect(a.getState().seleccion).toEqual({ tipo: 'vertice', indice: 1 })
    a.getState().irAPaso(2)
    expect(a.getState().seleccion).toBeNull()
    a.getState().seleccionar({ tipo: 'elemento', id: r.id })
    a.getState().irAPaso(2)
    expect(a.getState().seleccion).toEqual({ tipo: 'elemento', id: r.id })
    a.getState().irAPaso(1)
    expect(a.getState().seleccion).toBeNull()
    a.getState().seleccionar({ tipo: 'pared', indice: 0 })
    a.getState().irAPaso(2)
    expect(a.getState().seleccion).toBeNull()
  })

  it('abrirDelServidor deja historial vacío y origen servidor', () => {
    const a = crearAlmacen()
    a.getState().crear('salon', 400, 300, 250)
    a.getState().cambiar(mover(1))
    const doc = documentoNuevo('cocina', 500, 300, 250)
    a.getState().abrirDelServidor('d1', 4, 'Cocina', doc)
    expect(a.getState().documento).toEqual(doc)
    expect(a.getState().pasado).toEqual([])
    expect(a.getState().futuro).toEqual([])
    expect(a.getState().origen).toEqual({ tipo: 'servidor', id: 'd1', version: 4, nombre: 'Cocina' })
    expect(a.getState().guardado).toBe('guardado')
  })

  it('volverAAnonimo recupera el diseño anónimo guardado', () => {
    const anonimo = documentoNuevo('salon', 400, 300, 250)
    const m = new Map([[CLAVE_DISENO, JSON.stringify({ version: 1, documento: anonimo })]])
    const st = { getItem: (k: string) => m.get(k) ?? null } as Storage
    const a = crearAlmacen()
    a.getState().abrirDelServidor('d1', 4, 'Cocina', documentoNuevo('cocina', 500, 300, 250))
    a.getState().cambiar(mover(1))
    a.getState().volverAAnonimo(st)
    expect(a.getState().origen).toEqual({ tipo: 'anonimo' })
    expect(a.getState().documento).toEqual(anonimo)
    expect(a.getState().pasado).toEqual([])
  })

  it('volverAAnonimo sin almacenamiento recupera el anónimo que había en memoria', () => {
    const a = crearAlmacen()
    a.getState().crear('salon', 400, 300, 250)
    const anonimo = a.getState().documento
    a.getState().abrirDelServidor('d1', 4, 'Cocina', documentoNuevo('cocina', 500, 300, 250))
    a.getState().volverAAnonimo(null)
    expect(a.getState().documento).toBe(anonimo)
  })
})
