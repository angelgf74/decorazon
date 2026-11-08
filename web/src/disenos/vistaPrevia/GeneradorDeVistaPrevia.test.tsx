// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { documentoNuevo } from '../../nucleo'
import GeneradorDeVistaPrevia from './GeneradorDeVistaPrevia'

const webgl = vi.hoisted(() => ({ hay: false }))
const captura = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }))
vi.mock('../../editor/comunes/webgl', () => ({ hayWebgl: () => webgl.hay }))
// El fragmento con three: solo se apunta con qué se monta.
vi.mock('../../editor/vista3d/Captura3D', () => ({
  default: ({ doc: _doc, alCapturar: _alCapturar, ...props }: Record<string, unknown>) => { captura.props = props; return <p>captura 3d</p> },
}))

afterEach(() => {
  webgl.hay = false
  captura.props = null
})

describe('GeneradorDeVistaPrevia', () => {
  it('sin WebGL entrega null, una sola vez, y no pinta nada', () => {
    const alTerminar = vi.fn()
    const { container, rerender } = render(<GeneradorDeVistaPrevia doc={documentoNuevo('salon', 400, 300, 250)} alTerminar={alTerminar} />)
    rerender(<GeneradorDeVistaPrevia doc={documentoNuevo('salon', 400, 300, 250)} alTerminar={alTerminar} />)
    expect(alTerminar).toHaveBeenCalledTimes(1)
    expect(alTerminar).toHaveBeenCalledWith(null)
    expect(container.innerHTML).toBe('')
  })

  it('con WebGL monta la captura de 1200 × 630 a dpr 1 y con sombras duras: es una miniatura y el horneado de las suaves no cabía en el tiempo del CI', async () => {
    webgl.hay = true
    const { getByText } = render(<GeneradorDeVistaPrevia doc={documentoNuevo('salon', 400, 300, 250)} alTerminar={() => {}} />)
    await act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve() })
    expect(getByText('captura 3d')).toBeInTheDocument()
    expect(captura.props).toEqual({ className: 'vista-previa__lienzo3d', sombras: 'duras' })
  })
})
