// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { documentoNuevo } from '../../nucleo'
import GeneradorDeVistaPrevia from './GeneradorDeVistaPrevia'

describe('GeneradorDeVistaPrevia', () => {
  it('sin WebGL entrega null, una sola vez, y no pinta nada', () => {
    const alTerminar = vi.fn()
    const { container, rerender } = render(<GeneradorDeVistaPrevia doc={documentoNuevo('salon', 400, 300, 250)} alTerminar={alTerminar} />)
    rerender(<GeneradorDeVistaPrevia doc={documentoNuevo('salon', 400, 300, 250)} alTerminar={alTerminar} />)
    expect(alTerminar).toHaveBeenCalledTimes(1)
    expect(alTerminar).toHaveBeenCalledWith(null)
    expect(container.innerHTML).toBe('')
  })
})
