// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { catalogoBase, documentoNuevo, elementoNuevo } from '../../nucleo'
import { marcoDeImpresion } from './hoja'
import { exportarPlano, svgDelPlano } from './exportarPlano'

function cocina() {
  const doc = documentoNuevo('cocina', 400, 300, 250)
  doc.elementos = [elementoNuevo(catalogoBase.get('armario')!, { x: 100, y: 50 }, 'a')]
  doc.aberturas = [{ id: 'p', tipo: 'puerta', pared: 0, posicion: 150, ancho: 80, alto: 210, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' }]
  return doc
}

describe('svgDelPlano', () => {
  it('es un svg completo, con xmlns, el viewBox del marco de impresión y los estilos incrustados', () => {
    const doc = cocina()
    const svg = svgDelPlano(doc)
    const marco = marcoDeImpresion(doc.estancia.planta, doc.estancia.grosorPared)
    const raiz = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement
    expect(raiz.tagName).toBe('svg')
    expect(raiz.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg')
    expect(raiz.getAttribute('viewBox')).toBe(`0 0 ${marco.ancho} ${marco.alto}`)
    expect(raiz.getAttribute('width')).toBe(String(marco.ancho))
    expect(raiz.getAttribute('height')).toBe(String(marco.alto))
    const estilo = raiz.querySelector('style')!
    expect(estilo).not.toBeNull()
    expect(raiz.firstElementChild).toBe(estilo)
    // Lo que sin CSS saldría mal: las paredes pulsables (negras), el texto, las cotas y las huellas.
    for (const regla of ['.capa-planta__pared', '.lienzo__texto', '.capa-cotas__cota line', '.capa-elementos__huella', 'font-family']) {
      expect(estilo.textContent).toContain(regla)
    }
    // Sin variables de CSS sin resolver (solo --escala, que va en línea en el propio svg).
    expect(estilo.textContent).not.toMatch(/var\(--(?!escala)/)
    expect(raiz.querySelectorAll('[data-elemento="a"]')).toHaveLength(1)
    expect(raiz.querySelectorAll('text').length).toBeGreaterThan(0)
  })
})

describe('exportarPlano', () => {
  it('sin canvas (jsdom) devuelve el svg como imagen svg', async () => {
    const imagen = await exportarPlano(cocina())
    expect(imagen.blob.type).toBe('image/svg+xml')
    expect(imagen.extension).toBe('svg')
    expect(await imagen.blob.text()).toContain('<svg')
  })
})
