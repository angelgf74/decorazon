// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAVE_MIS_PRODUCTOS, guardarProducto, leerProductos, MAXIMO_PRODUCTOS, olvidarProducto, productosDelTipo, reiniciarMisProductos, type ProductoGuardado } from './misProductos'

const pax = (referencia = '805.483.84', precio = 179): ProductoGuardado => ({
  tipo: 'armario',
  origen: { tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX', referencia, url: 'https://www.ikea.com/es/es/p/pax-80548384/', precio, fechaPrecio: '2026-11-07' },
  medidas: { ancho: 100, fondo: 58, alto: 201 },
})

beforeEach(() => {
  localStorage.clear()
  reiniciarMisProductos()
})
afterEach(() => vi.restoreAllMocks())

describe('mis productos de tienda (M-17)', () => {
  it('guardar uno lo pone el primero y se lee igual', () => {
    guardarProducto(pax())
    expect(leerProductos()).toEqual([pax()])
    expect(JSON.parse(localStorage.getItem(CLAVE_MIS_PRODUCTOS)!)).toHaveLength(1)
  })

  it('el mismo producto (tienda, nombre y referencia) no se repite: se actualiza y sube al principio', () => {
    guardarProducto(pax('805.483.84', 179))
    guardarProducto(pax('111.111.11'))
    guardarProducto(pax('805.483.84', 199))
    const lista = leerProductos()
    expect(lista).toHaveLength(2)
    expect(lista[0]!.origen.precio).toBe(199)
    expect(lista[1]!.origen.referencia).toBe('111.111.11')
  })

  it(`guarda como mucho ${30}: se pierden los más antiguos`, () => {
    for (let i = 0; i < MAXIMO_PRODUCTOS + 5; i++) guardarProducto(pax(`ref-${i}`))
    const lista = leerProductos()
    expect(lista).toHaveLength(MAXIMO_PRODUCTOS)
    expect(lista[0]!.origen.referencia).toBe(`ref-${MAXIMO_PRODUCTOS + 4}`)
  })

  it('productosDelTipo da solo los de ese tipo', () => {
    guardarProducto(pax())
    guardarProducto({ tipo: 'cama', origen: { tipo: 'tienda', proveedor: 'IKEA', nombre: 'MALM' }, medidas: { ancho: 160, fondo: 209, alto: 38 } })
    expect(productosDelTipo('armario').map((p) => p.origen.nombre)).toEqual(['PAX'])
    expect(productosDelTipo('mesa')).toEqual([])
  })

  it('olvidar uno lo quita', () => {
    guardarProducto(pax('a'))
    guardarProducto(pax('b'))
    olvidarProducto(leerProductos()[0]!)
    expect(leerProductos().map((p) => p.origen.referencia)).toEqual(['a'])
  })

  it('lo que no valida se descarta al leer: tipo que no existe, medidas fuera de rango, enlace javascript:, precio raro o JSON roto', () => {
    const malos = [
      { ...pax(), tipo: 'nave-espacial' },
      { ...pax(), medidas: { ancho: 99999, fondo: 58, alto: 201 } },
      { ...pax(), origen: { ...pax().origen, url: 'javascript:alert(1)' } },
      { ...pax(), origen: { ...pax().origen, precio: -3 } },
      { ...pax(), origen: { ...pax().origen, nombre: '' } },
      'texto',
    ]
    localStorage.setItem(CLAVE_MIS_PRODUCTOS, JSON.stringify([...malos, pax()]))
    expect(leerProductos()).toEqual([pax()])
    localStorage.setItem(CLAVE_MIS_PRODUCTOS, '{roto')
    reiniciarMisProductos()
    expect(leerProductos()).toEqual([])
  })

  it('con localStorage lleno o bloqueado, se recuerda en memoria lo que dura la pestaña', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('lleno', 'QuotaExceededError') })
    guardarProducto(pax())
    expect(leerProductos()).toEqual([pax()])
  })
})
