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
    // El de la L, en el centro del tablero principal (160×140: y de 30 a 90).
    expect([nombres[0]!.getAttribute('x'), nombres[0]!.getAttribute('y')]).toEqual(['100', '60'])
  })
})
