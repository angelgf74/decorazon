// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { catalogoBase, documentoNuevo, elementoNuevo } from '../../../nucleo'
import CapaElementos from './CapaElementos'

describe('CapaElementos', () => {
  it('los nombres van por encima de todas las piezas: lo que está bajo una mesa no tapa el de la mesa', () => {
    const doc = documentoNuevo('despacho', 400, 400, 250)
    doc.elementos = [
      elementoNuevo(catalogoBase.get('escritorio-l')!, { x: 100, y: 100 }, 'l'),
      elementoNuevo(catalogoBase.get('reposapies')!, { x: 100, y: 60 }, 'r'),
    ]
    const { container } = render(<svg><CapaElementos documento={doc} conflictos={[]} seleccion={null} /></svg>)
    const capa = container.querySelector('.capa-elementos')!
    const nombres = [...capa.querySelectorAll('text')]
    expect(nombres.map((t) => t.textContent)).toEqual(['Escritorio en L', 'Reposapiés'])
    const ultimaHuella = [...capa.querySelectorAll('.capa-elementos__huella')].at(-1)!
    for (const t of nombres) expect(ultimaHuella.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // El de la L, en el centro del tablero principal (160×140: y de 30 a 90); el reposapiés cae en el mismo sitio, así
    // que los dos nombres se reparten una línea arriba y otra abajo de y = 60.
    expect(nombres[0]!.getAttribute('x')).toBe('100')
    expect((Number(nombres[0]!.getAttribute('y')) + Number(nombres[1]!.getAttribute('y'))) / 2).toBeCloseTo(60)
  })

  it('el espejo colgado sobre el lavabo: los dos nombres, uno encima del otro, el del espejo arriba', () => {
    const doc = documentoNuevo('bano', 300, 250, 250)
    doc.elementos = [
      // Contra la pared de la derecha (x = 300): los nombres caen en la misma línea, a 21,5 cm.
      { ...elementoNuevo(catalogoBase.get('lavabo')!, { x: 277, y: 150 }, 'l'), rotacion: 90 },
      { ...elementoNuevo(catalogoBase.get('espejo')!, { x: 298.5, y: 150 }, 'e'), rotacion: 90 },
    ]
    const { container } = render(<svg><CapaElementos documento={doc} conflictos={[]} seleccion={null} escala={1} /></svg>)
    const y = (texto: string) => Number([...container.querySelectorAll('text')].find((t) => t.textContent === texto)!.getAttribute('y'))
    // A escala 1 (px por cm), una línea son 14 cm.
    expect(y('Lavabo') - y('Espejo')).toBeCloseTo(14)
  })
})

describe('CapaElementos: muebles de tienda', () => {
  it('el nombre del plano es el del producto', () => {
    const doc = documentoNuevo('dormitorio', 400, 400, 250)
    const armario = elementoNuevo(catalogoBase.get('armario')!, { x: 200, y: 200 }, 'a')
    doc.elementos = [{ ...armario, origen: { tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX' } }]
    const { container } = render(<svg><CapaElementos documento={doc} conflictos={[]} seleccion={null} /></svg>)
    expect([...container.querySelectorAll('.capa-elementos text')].map((t) => t.textContent)).toEqual(['PAX'])
  })

  it('un nombre largo se recorta en el plano con «…»', () => {
    const doc = documentoNuevo('dormitorio', 400, 400, 250)
    const armario = elementoNuevo(catalogoBase.get('armario')!, { x: 200, y: 200 }, 'a')
    doc.elementos = [{ ...armario, origen: { tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX armario blanco con puertas correderas' } }]
    const { container } = render(<svg><CapaElementos documento={doc} conflictos={[]} seleccion={null} /></svg>)
    expect(container.querySelector('.capa-elementos text')!.textContent).toBe('PAX armario blanco…')
  })
})
