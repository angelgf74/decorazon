// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { catalogoBase, documentoNuevo, elementoNuevo } from '../../nucleo'
import PlanoAmpliado from './PlanoAmpliado'

const doc = documentoNuevo('bano', 250, 200, 250)
doc.elementos = [elementoNuevo(catalogoBase.get('inodoro')!, { x: 100, y: 33 }, 'i')]

/** Escala y desplazamiento del grupo que lleva el plano. */
function vista() {
  const t = screen.getByRole('img', { name: 'Plano' }).querySelector('g[transform]')!.getAttribute('transform')!
  const [x, y, escala] = t.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g)!.map(Number)
  return { x: x!, y: y!, escala: escala! }
}

beforeEach(() => {
  // jsdom no mide: la zona del plano ocupa 400×600 px.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 400, bottom: 600, width: 400, height: 600, toJSON: () => ({}) })
})
afterEach(() => vi.restoreAllMocks())

describe('PlanoAmpliado', () => {
  it('es un diálogo con el plano entero, que se cierra con «Cerrar» o con Escape', async () => {
    const alCerrar = vi.fn()
    render(<PlanoAmpliado doc={doc} alCerrar={alCerrar} />)
    expect(screen.getByRole('dialog', { name: 'Plano' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Plano' }).querySelector('[data-elemento="i"]')).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(alCerrar).toHaveBeenCalledTimes(2)
  })

  it('«Acercar» y «Alejar» cambian la escala, y «Encuadrar» vuelve a la de partida', async () => {
    render(<PlanoAmpliado doc={doc} alCerrar={() => {}} />)
    const inicial = vista().escala
    await userEvent.click(screen.getByRole('button', { name: 'Acercar' }))
    expect(vista().escala).toBeGreaterThan(inicial)
    await userEvent.click(screen.getByRole('button', { name: 'Alejar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Alejar' }))
    expect(vista().escala).toBeLessThan(inicial)
    await userEvent.click(screen.getByRole('button', { name: 'Encuadrar' }))
    expect(vista().escala).toBeCloseTo(inicial)
  })

  it('arrastrar con un dedo mueve el plano', () => {
    render(<PlanoAmpliado doc={doc} alCerrar={() => {}} />)
    const svg = screen.getByRole('img', { name: 'Plano' })
    const antes = vista()
    fireEvent.pointerDown(svg, { pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 130, clientY: 80 })
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 130, clientY: 80 })
    expect(vista().x).toBeCloseTo(antes.x + 30)
    expect(vista().y).toBeCloseTo(antes.y - 20)
    expect(vista().escala).toBeCloseTo(antes.escala)
  })

  it('pellizcar con dos dedos que se separan acerca el plano', () => {
    render(<PlanoAmpliado doc={doc} alCerrar={() => {}} />)
    const svg = screen.getByRole('img', { name: 'Plano' })
    const antes = vista().escala
    fireEvent.pointerDown(svg, { pointerId: 1, clientX: 180, clientY: 300 })
    fireEvent.pointerDown(svg, { pointerId: 2, clientX: 220, clientY: 300 })
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: 140, clientY: 300 })
    fireEvent.pointerMove(svg, { pointerId: 2, clientX: 260, clientY: 300 })
    fireEvent.pointerUp(svg, { pointerId: 1 })
    fireEvent.pointerUp(svg, { pointerId: 2 })
    expect(vista().escala).toBeCloseTo(antes * 3)
  })
})
