import { describe, expect, it } from 'vitest'
import { esFechaPrecio, esPrecio, esUrlDeProducto, leerMedidas, LIMITES_TIENDA, limpiarUrl } from './tienda'

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

describe('leerMedidas: el texto que pega el usuario', () => {
  it('etiquetas en cualquier orden, con o sin dos puntos, con tildes o sin ellas', () => {
    expect(leerMedidas('Ancho: 110 cm\nProfundidad: 58 cm\nAltura: 201 cm')).toEqual({ ancho: 110, fondo: 58, alto: 201 })
    expect(leerMedidas('Altura 236 cm · Anchura 50 cm · Fondo 60 cm')).toEqual({ ancho: 50, fondo: 60, alto: 236 })
  })

  it('ancho × fondo × alto en una línea, con x o ×', () => {
    expect(leerMedidas('Medidas: 110x58x201 cm')).toEqual({ ancho: 110, fondo: 58, alto: 201 })
    expect(leerMedidas('80 × 40 × 75 cm')).toEqual({ ancho: 80, fondo: 40, alto: 75 })
  })

  it('el formato de un esquinero: los dos lados y el alto', () => {
    expect(leerMedidas('110/110x201 cm')).toEqual({ ancho: 110, fondo: 110, alto: 201 })
    expect(leerMedidas('PAX / GRIMO 160/88 x 236 cm')).toEqual({ ancho: 160, fondo: 88, alto: 236 })
  })

  it('decimales con coma o punto, redondeados al centímetro', () => {
    expect(leerMedidas('Ancho: 99,6 cm Fondo: 58.4 cm Alto: 200,5 cm')).toEqual({ ancho: 100, fondo: 58, alto: 201 })
  })

  it('solo lo que encuentra; un texto sin medidas, nada', () => {
    expect(leerMedidas('Ancho: 120 cm')).toEqual({ ancho: 120 })
    expect(leerMedidas('Un armario precioso')).toEqual({})
    expect(leerMedidas('')).toEqual({})
  })
})

describe('leerMedidas: etiquetas que no son las del mueble', () => {
  it('las etiquetas con complemento no cuentan: del asiento, del colchón, máx., del cajón', () => {
    expect(leerMedidas('200x88x83 cm\nAltura del asiento: 45 cm')).toEqual({ ancho: 200, fondo: 88, alto: 83 })
    expect(leerMedidas('Ancho del colchón: 90 cm\nAncho: 100 cm')).toEqual({ ancho: 100 })
    expect(leerMedidas('Altura máx.: 250 cm')).toEqual({})
    expect(leerMedidas('Profundidad del cajón 40 cm\nFondo: 58 cm')).toEqual({ fondo: 58 })
  })

  it('el número en la línea de abajo, como al copiar una tabla', () => {
    expect(leerMedidas('Ancho\n110 cm\nFondo\n58 cm\nAltura\n201 cm')).toEqual({ ancho: 110, fondo: 58, alto: 201 })
  })

  it('un texto enorme no se queda pensando: se lee solo el principio', () => {
    const inicio = performance.now()
    expect(leerMedidas('1'.repeat(20_000))).toEqual({})
    expect(performance.now() - inicio).toBeLessThan(200)
  })
})
