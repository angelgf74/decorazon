// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

describe('CapaElementos: cada pieza (vía Pieza)', () => {
  it('el elegido lleva un halo por debajo de la huella y las aperturas van con trazo discontinuo', () => {
    const doc = documentoNuevo('dormitorio', 400, 400, 250)
    const armario = catalogoBase.get('armario')!
    doc.elementos = [elementoNuevo(armario, { x: 200, y: 200 }, 'a')]
    const { container } = render(<svg><CapaElementos documento={doc} conflictos={[]} seleccion={{ tipo: 'elemento', id: 'a' }} /></svg>)
    const pieza = container.querySelector('[data-elemento="a"]')!
    expect(pieza).toHaveClass('lienzo--seleccionado')
    const halo = pieza.querySelector('.capa-elementos__halo')!
    const huella = pieza.querySelector('.capa-elementos__huella')!
    expect(halo.compareDocumentPosition(huella) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const aperturas = pieza.querySelectorAll('.capa-elementos__apertura')
    expect(aperturas.length).toBe(armario.zonasApertura(doc.elementos[0]!).length)
    for (const a of aperturas) expect(a.getAttribute('stroke-dasharray')).toBeTruthy()
  })
})

describe('CapaElementos: con el teclado (M-28)', () => {
  function docConMuebles() {
    const doc = documentoNuevo('dormitorio', 400, 330, 250)
    doc.elementos = [
      elementoNuevo(catalogoBase.get('armario')!, { x: 300, y: 100 }, 'armario-derecha'),
      elementoNuevo(catalogoBase.get('cama')!, { x: 200, y: 200 }, 'cama-abajo'),
      elementoNuevo(catalogoBase.get('mesita')!, { x: 60, y: 100 }, 'mesita-izquierda'),
      elementoNuevo(catalogoBase.get('alfombra')!, { x: 200, y: 250 }, 'alfombra'),
    ]
    return doc
  }
  const montar = (doc = docConMuebles(), extra: Partial<Parameters<typeof CapaElementos>[0]> = {}) =>
    render(<svg><CapaElementos documento={doc} conflictos={[]} seleccion={null} alPulsar={() => {}} alSeleccionar={() => {}} {...extra} /></svg>)

  it('las piezas se pintan en el orden de siempre (alfombras debajo, luego el de inserción): el DOM no se reordena al moverlas', () => {
    const { container } = montar()
    expect([...container.querySelectorAll('[data-elemento]')].map((g) => g.getAttribute('data-elemento'))).toEqual(['alfombra', 'armario-derecha', 'cama-abajo', 'mesita-izquierda'])
    // Lo que se pinta no es botón: las asas de foco van aparte.
    for (const g of container.querySelectorAll('[data-elemento]')) expect(g).not.toHaveAttribute('tabindex')
  })

  it('las asas de foco son botones aparte, en orden de posición (arriba-abajo, izquierda-derecha), con las alfombras primero y sin puntero', () => {
    const { getAllByRole } = montar()
    const asas = getAllByRole('button')
    expect(asas.map((b) => b.getAttribute('data-foco'))).toEqual(['alfombra', 'mesita-izquierda', 'armario-derecha', 'cama-abajo'])
    for (const b of asas) {
      expect(b).toHaveAttribute('tabindex', '0')
      expect(b).toHaveClass('capa-elementos__foco')
    }
    expect(asas[3]).toHaveAttribute('aria-label', 'Cama 150 × 200 cm')
    expect(asas[3]).not.toHaveAttribute('aria-current')
  })

  it('recibir el foco (Tab) selecciona la pieza; Intro y Espacio también; otra tecla, no', () => {
    const alSeleccionar = vi.fn()
    const { getByRole } = montar(docConMuebles(), { alSeleccionar })
    const cama = getByRole('button', { name: 'Cama 150 × 200 cm' })
    fireEvent.focus(cama)
    fireEvent.keyDown(cama, { key: 'Enter' })
    fireEvent.keyDown(cama, { key: ' ' })
    fireEvent.keyDown(cama, { key: 'r' })
    expect(alSeleccionar.mock.calls).toEqual([['cama-abajo'], ['cama-abajo'], ['cama-abajo']])
  })

  it('la seleccionada lleva aria-current y una bloqueada lo dice con su género', () => {
    const doc = docConMuebles()
    doc.elementos[0] = { ...doc.elementos[0]!, bloqueado: true }
    doc.elementos[1] = { ...doc.elementos[1]!, bloqueado: true }
    const { getByRole } = montar(doc, { seleccion: { tipo: 'elemento', id: 'cama-abajo' } })
    expect(getByRole('button', { name: 'Cama 150 × 200 cm, bloqueada' })).toHaveAttribute('aria-current', 'true')
    expect(getByRole('button', { name: 'Armario 100 × 60 cm, bloqueado' })).not.toHaveAttribute('aria-current')
  })

  it('los nombres del plano no se leen dos veces: el grupo va oculto al lector', () => {
    const { container } = montar()
    expect(container.querySelector('.capa-elementos__nombres')).toHaveAttribute('aria-hidden', 'true')
  })

  it('sin alPulsar (paso 1, midiendo, plano exportado) no hay asas ni tabindex', () => {
    const { queryAllByRole, container } = render(<svg><CapaElementos documento={docConMuebles()} conflictos={[]} seleccion={null} /></svg>)
    expect(queryAllByRole('button')).toHaveLength(0)
    expect(container.querySelector('[tabindex]')).toBeNull()
    expect(container.querySelector('.capa-elementos__foco')).toBeNull()
  })
})

describe('CapaElementos: teclado con varios seleccionados (M-02)', () => {
  it('con un grupo, el foco no lo deshace; Mayús+Intro añade o quita la pieza con el foco', () => {
    const doc = documentoNuevo('dormitorio', 400, 330, 250)
    doc.elementos = [
      elementoNuevo(catalogoBase.get('mesita')!, { x: 60, y: 100 }, 'a'),
      elementoNuevo(catalogoBase.get('mesita')!, { x: 160, y: 100 }, 'b'),
      elementoNuevo(catalogoBase.get('mesita')!, { x: 260, y: 100 }, 'c'),
    ]
    const alSeleccionar = vi.fn()
    const alAlternar = vi.fn()
    const { container } = render(<svg><CapaElementos documento={doc} conflictos={[]} seleccion={{ tipo: 'elementos', ids: ['a', 'b'] }}
      alPulsar={() => {}} alSeleccionar={alSeleccionar} alAlternar={alAlternar} /></svg>)
    const asa = (id: string) => container.querySelector(`[data-foco="${id}"]`)!
    expect(asa('a')).toHaveAttribute('aria-current', 'true')
    expect(asa('b')).toHaveAttribute('aria-current', 'true')
    fireEvent.focus(asa('c'))
    expect(alSeleccionar).not.toHaveBeenCalled()
    fireEvent.keyDown(asa('c'), { key: 'Enter', shiftKey: true })
    expect(alAlternar).toHaveBeenCalledWith('c', { tipo: 'elementos', ids: ['a', 'b'] })
    expect(alSeleccionar).not.toHaveBeenCalled()
  })
})

describe('CapaElementos: formar un grupo con el teclado (M-02, revisión)', () => {
  it('Mayús+Intro alterna sobre la selección que había antes de que el foco eligiera la pieza', () => {
    const doc = documentoNuevo('dormitorio', 400, 330, 250)
    doc.elementos = [
      elementoNuevo(catalogoBase.get('mesita')!, { x: 60, y: 100 }, 'a'),
      elementoNuevo(catalogoBase.get('mesita')!, { x: 160, y: 100 }, 'b'),
    ]
    const alSeleccionar = vi.fn()
    const alAlternar = vi.fn()
    const { container, rerender } = render(<svg><CapaElementos documento={doc} conflictos={[]} seleccion={{ tipo: 'elemento', id: 'a' }}
      alPulsar={() => {}} alSeleccionar={alSeleccionar} alAlternar={alAlternar} /></svg>)
    const asa = (id: string) => container.querySelector(`[data-foco="${id}"]`)!
    // Tab llega a B: B queda seleccionada (como siempre)…
    fireEvent.focus(asa('b'))
    expect(alSeleccionar).toHaveBeenCalledWith('b')
    rerender(<svg><CapaElementos documento={doc} conflictos={[]} seleccion={{ tipo: 'elemento', id: 'b' }}
      alPulsar={() => {}} alSeleccionar={alSeleccionar} alAlternar={alAlternar} /></svg>)
    // …y Mayús+Intro la añade a lo que había antes (A), no la quita.
    fireEvent.keyDown(asa('b'), { key: 'Enter', shiftKey: true })
    expect(alAlternar).toHaveBeenCalledWith('b', { tipo: 'elemento', id: 'a' })
  })
})
