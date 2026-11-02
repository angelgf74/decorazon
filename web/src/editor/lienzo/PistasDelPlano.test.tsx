// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { textos } from '../../textos'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import PistasDelPlano, { CLAVE_PISTAS_OCULTAS } from './PistasDelPlano'

const t = textos.lienzo.pistas

beforeEach(() => {
  localStorage.clear()
  reiniciarAlmacen()
  almacen.getState().crear('dormitorio', 400, 330, 250)
})

afterEach(() => vi.restoreAllMocks())

describe('PistasDelPlano', () => {
  it('en el paso 1 explica las esquinas y el +; en el 2, los muebles', () => {
    render(<PistasDelPlano />)
    expect(screen.getByText(t.paso1[0]!)).toBeInTheDocument()
    expect(screen.getByText(t.paso1[1]!)).toBeInTheDocument()
    act(() => almacen.getState().irAPaso(2))
    expect(screen.queryByText(t.paso1[0]!)).toBeNull()
    expect(screen.getByText(t.paso2[0]!)).toBeInTheDocument()
  })

  it('con el dedo explica el pellizco en vez de la rueda', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(pointer: coarse)' }))
    try {
      render(<PistasDelPlano />)
      expect(screen.getByText(t.pellizco)).toBeInTheDocument()
      expect(screen.queryByText(t.rueda)).toBeNull()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('ocultarlas se recuerda y se pueden volver a mostrar', async () => {
    const { unmount } = render(<PistasDelPlano />)
    await userEvent.click(screen.getByRole('button', { name: t.ocultar }))
    expect(screen.queryByText(t.paso1[0]!)).toBeNull()
    expect(localStorage.getItem(CLAVE_PISTAS_OCULTAS)).toBe('1')
    unmount()

    render(<PistasDelPlano />)
    expect(screen.queryByText(t.paso1[0]!)).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: t.mostrar }))
    expect(screen.getByText(t.paso1[0]!)).toBeInTheDocument()
    expect(localStorage.getItem(CLAVE_PISTAS_OCULTAS)).toBeNull()
  })

  it('sin almacenamiento sigue funcionando en la sesión', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado') })
    render(<PistasDelPlano />)
    expect(screen.getByText(t.paso1[0]!)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: t.ocultar }))
    expect(screen.getByRole('button', { name: t.mostrar })).toBeInTheDocument()
  })
})
