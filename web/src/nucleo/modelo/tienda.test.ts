import { describe, expect, it } from 'vitest'
import { esFechaPrecio, esPrecio, esUrlDeProducto, LIMITES_TIENDA, limpiarUrl } from './tienda'

describe('limpiarUrl', () => {
  it('sin esquema le pone https://', () => {
    expect(limpiarUrl('  www.ikea.com/es/es/p/pax-armario-80548384/  ')).toBe('https://www.ikea.com/es/es/p/pax-armario-80548384/')
  })

  it('quita los parámetros de seguimiento y deja los demás', () => {
    expect(limpiarUrl('https://www.ikea.com/es/es/p/pax?utm_source=x&utm_medium=y&color=blanco&gclid=1&fbclid=2&srsltid=3'))
      .toBe('https://www.ikea.com/es/es/p/pax?color=blanco')
  })

  it('sin parámetros que queden no deja el «?» colgando', () => {
    expect(limpiarUrl('https://tienda.es/p/1?utm_campaign=a&awc=b&irclickid=c')).toBe('https://tienda.es/p/1')
  })

  it('admite http y conserva el fragmento', () => {
    expect(limpiarUrl('http://tienda.es/p/1#medidas')).toBe('http://tienda.es/p/1#medidas')
  })

  it('rechaza otros esquemas: javascript, data, ftp, mailto', () => {
    for (const url of ['javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,hola', 'ftp://tienda.es/x', 'mailto:a@b.es']) {
      expect(limpiarUrl(url)).toBeNull()
    }
  })

  it('rechaza lo que no es una dirección: vacío, espacios, un nombre sin dominio', () => {
    for (const url of ['', '   ', 'ikea', 'https://', 'no es una url']) expect(limpiarUrl(url)).toBeNull()
  })

  it('rechaza las direcciones demasiado largas', () => {
    expect(limpiarUrl(`https://tienda.es/${'a'.repeat(LIMITES_TIENDA.url)}`)).toBeNull()
  })
})

describe('esUrlDeProducto', () => {
  it('solo http o https bien formada y dentro del límite', () => {
    expect(esUrlDeProducto('https://www.ikea.com/es/es/p/pax/')).toBe(true)
    expect(esUrlDeProducto('http://tienda.es/x')).toBe(true)
    expect(esUrlDeProducto('javascript:alert(1)')).toBe(false)
    expect(esUrlDeProducto('www.ikea.com')).toBe(false)
    expect(esUrlDeProducto(`https://tienda.es/${'a'.repeat(LIMITES_TIENDA.url)}`)).toBe(false)
  })
})

describe('esPrecio', () => {
  it('importes de 0 a un millón con dos decimales como mucho', () => {
    for (const p of [0, 199, 199.9, 199.99, 0.1 + 0.2, 1_000_000]) expect(esPrecio(p)).toBe(true)
    for (const p of [-1, 1_000_000.01, 199.999, Number.NaN, Number.POSITIVE_INFINITY, '199']) expect(esPrecio(p)).toBe(false)
  })
})

describe('esFechaPrecio', () => {
  it('fechas reales en AAAA-MM-DD', () => {
    expect(esFechaPrecio('2026-11-03')).toBe(true)
    expect(esFechaPrecio('2024-02-29')).toBe(true)
    for (const f of ['2026-02-30', '2026-13-01', '03/11/2026', '2026-11-3', '', 20261103]) expect(esFechaPrecio(f)).toBe(false)
  })
})
