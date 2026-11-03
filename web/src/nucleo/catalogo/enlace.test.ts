import { describe, expect, it } from 'vitest'
import { catalogoBase } from './catalogoBase'
import { leerEnlace } from './enlace'

const leer = (url: string) => leerEnlace(url, catalogoBase)

describe('leerEnlace: solo el texto de la dirección', () => {
  it('el ejemplo de IKEA: tienda, nombre, referencia, tipo y color', () => {
    expect(leer('https://www.ikea.com/es/es/p/pax-grimo-armario-esquinero-blanco-blanco-s29502652')).toEqual({
      proveedor: 'IKEA', nombre: 'PAX / GRIMO', referencia: '295.026.52', tipo: 'armario-esquinero', color: '#f2f2f0',
    })
  })

  it('IKEA sin la «s» de las combinaciones, con barra final y parámetros; la coincidencia más larga del tipo gana', () => {
    expect(leer('ikea.com/es/es/p/malm-comoda-de-6-cajones-roble-80403586/?utm_source=x')).toMatchObject({
      proveedor: 'IKEA', nombre: 'MALM', referencia: '804.035.86', tipo: 'comoda', color: '#c49a6c',
    })
    expect(leer('https://www.ikea.com/es/es/p/pax-armario-blanco-80548384/')).toMatchObject({ tipo: 'armario', nombre: 'PAX' })
  })

  it('otra tienda de la lista: el nombre es la ruta legible, sin código final, y la referencia no se adivina', () => {
    const r = leer('https://www.kavehome.com/es/es/p/sofa-de-3-plazas-gilma-gris-oscuro-210-cm-S751PM21')
    expect(r.proveedor).toBe('Kave Home')
    expect(r.referencia).toBeUndefined()
    expect(r.tipo).toBe('sofa')
    expect(r.color).toBe('#5e5e5c')
    expect(r.nombre).toBe('Sofa de 3 plazas gilma gris oscuro 210 cm')
  })

  it('las tiendas por dominio, con cualquier dominio de país', () => {
    expect(leer('https://www.leroymerlin.es/productos/armario-1.html').proveedor).toBe('Leroy Merlin')
    expect(leer('https://www.elcorteingles.es/hogar/A1-cama/').proveedor).toBe('El Corte Inglés')
    expect(leer('https://www.amazon.es/dp/B0ABCDEF12').proveedor).toBe('Amazon')
    expect(leer('https://www.ikea.pt/pt/p/x-12345678').proveedor).toBe('IKEA')
  })

  it('un dominio que no está en la tabla no rellena la tienda, pero sí lo demás', () => {
    const r = leer('https://www.mueblesdelbarrio.es/mesita-de-noche-nogal')
    expect(r.proveedor).toBeUndefined()
    expect(r).toMatchObject({ tipo: 'mesita', color: '#6b4a33', nombre: 'Mesita de noche nogal' })
  })

  it('lo que no se lee no rellena nada: sin ruta, javascript:, vacío, texto suelto', () => {
    expect(leer('https://www.ikea.com/')).toEqual({ proveedor: 'IKEA' })
    for (const url of ['javascript:alert(1)', '', 'no es un enlace']) expect(leer(url)).toEqual({})
  })

  it('el nombre se recorta al límite de 80', () => {
    const r = leer(`https://tienda.es/${'palabra-'.repeat(20)}x`)
    expect(r.nombre!.length).toBeLessThanOrEqual(80)
  })
})

describe('leerEnlace: lo que no debe confundir', () => {
  it('un tipo detrás de «de», «para» o «con» no cuenta: lámpara de mesa, silla de escritorio, cabecero de cama', () => {
    expect(leer('https://www.ikea.com/es/es/p/lauters-lampara-de-mesa-fresno-blanco-60405037/')).toMatchObject({ nombre: 'LAUTERS' })
    expect(leer('https://www.ikea.com/es/es/p/lauters-lampara-de-mesa-fresno-blanco-60405037/').tipo).toBeUndefined()
    expect(leer('https://www.ikea.com/es/es/p/markus-silla-de-escritorio-negro-90289172/')).toMatchObject({ tipo: 'silla', nombre: 'MARKUS' })
    expect(leer('https://www.ikea.com/es/es/p/malm-cabecero-de-cama-blanco-10360113/')).toMatchObject({ nombre: 'MALM' })
    expect(leer('https://www.ikea.com/es/es/p/malm-cabecero-de-cama-blanco-10360113/').tipo).toBeUndefined()
  })

  it('a igual largo, gana el tipo que va antes en la dirección', () => {
    expect(leer('https://tienda.es/silla-escritorio-gris').tipo).toBe('silla')
  })

  it('la tienda es la del dominio registrado, no un subdominio de otro', () => {
    expect(leer('https://ikea.otrodominio.com/p/pax-12345678').proveedor).toBeUndefined()
    expect(leer('https://www.ikea.co.uk/gb/en/p/pax-wardrobe-12345678').proveedor).toBe('IKEA')
    expect(leer('https://www.amazon.com.mx/dp/B0ABCDEF12').proveedor).toBe('Amazon')
  })

  it('el nombre, del último tramo con palabras: ni «ref=…» de Amazon ni códigos al principio', () => {
    expect(leer('https://www.amazon.es/dp/B0ABCDEF12/ref=sr_1_1').nombre).toBeUndefined()
    expect(leer('https://www.amazon.es/Armario-puertas-correderas-blanco/dp/B0ABCDEF12/ref=sr_1_1')).toMatchObject({ nombre: 'Armario puertas correderas blanco', tipo: 'armario', color: '#f2f2f0' })
    expect(leer('https://www.elcorteingles.es/hogar/A41361398-sofa-de-3-plazas-gris/').nombre).toBe('Sofa de 3 plazas gris')
  })

  it('el color es el primero que nombra la dirección, no el primero de la tabla', () => {
    expect(leer('https://tienda.es/comoda-roble-blanco').color).toBe('#c49a6c')
    expect(leer('https://tienda.es/mesita-nogal-negro').color).toBe('#6b4a33')
  })
})
