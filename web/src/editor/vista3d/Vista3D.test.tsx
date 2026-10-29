// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import Vista3D from './Vista3D'

const fallo = vi.hoisted(() => ({ lanzar: false }))

vi.mock('@react-three/fiber', async (original) => {
  const real = await original<typeof import('@react-three/fiber')>()
  return {
    ...real,
    Canvas: ({ onPointerMissed }: { onPointerMissed?: () => void }) => {
      if (fallo.lanzar) throw new Error('Error creating WebGL context')
      return <canvas onClick={() => onPointerMissed?.()} />
    },
  }
})

vi.mock('@react-three/drei', () => ({ Environment: () => null, Lightformer: () => null, OrbitControls: () => null }))

const SIN_WEBGL = 'Tu navegador no puede mostrar la vista 3D. El plano 2D sigue funcionando.'

beforeEach(() => {
  reiniciarAlmacen()
  almacen.getState().crear('salon', 400, 330, 250)
  almacen.getState().cambiarVista('3d')
  fallo.lanzar = false
})

afterEach(() => vi.restoreAllMocks())

/** Contexto WebGL de prueba: solo lo que usa la comprobación previa. */
function conWebgl() {
  const loseContext = vi.fn()
  const contexto = { getExtension: (n: string) => (n === 'WEBGL_lose_context' ? { loseContext } : null) }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(contexto as unknown as RenderingContext)
  return loseContext
}

describe('Vista3D', () => {
  it('sin contexto WebGL avisa y "Volver al 2D" vuelve al plano', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    render(<Vista3D />)
    expect(screen.getByText(SIN_WEBGL)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Volver al 2D' }))
    expect(almacen.getState().vista).toBe('2d')
  })

  it('si el lienzo falla al montarse, el mismo aviso', () => {
    conWebgl()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fallo.lanzar = true
    render(<Vista3D />)
    expect(screen.getByText(SIN_WEBGL)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volver al 2D' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ocultar paredes delante' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Encuadrar' })).toBeNull()
  })

  it('el clic en el vacío del lienzo anula la selección', () => {
    conWebgl()
    almacen.getState().seleccionar({ tipo: 'elemento', id: 'x' })
    const { container } = render(<Vista3D />)
    fireEvent.click(container.querySelector('canvas')!)
    expect(almacen.getState().seleccion).toBeNull()
  })

  it('"Ocultar paredes delante" está activado por defecto y se alterna; "Encuadrar" existe', async () => {
    conWebgl()
    render(<Vista3D />)
    const ocultar = screen.getByRole('button', { name: 'Ocultar paredes delante' })
    expect(ocultar).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(ocultar)
    expect(ocultar).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Encuadrar' })).toBeInTheDocument()
  })

  it('con WebGL monta el lienzo y libera el contexto de la comprobación', () => {
    const loseContext = conWebgl()
    const { container } = render(<Vista3D />)
    expect(screen.queryByText(SIN_WEBGL)).toBeNull()
    expect(container.querySelector('canvas')).not.toBeNull()
    expect(loseContext).toHaveBeenCalledTimes(1)
  })
})
