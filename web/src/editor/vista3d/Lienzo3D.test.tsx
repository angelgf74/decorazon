// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Lienzo3D from './Lienzo3D'

const fotograma = vi.hoisted(() => ({ alPintar: [] as (() => void)[] }))

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="lienzo">{children}</div>,
  useFrame: (alPintar: () => void) => {
    fotograma.alPintar.push(alPintar)
  },
}))

const PREPARANDO = 'Preparando la vista 3D…'
let cola: FrameRequestCallback[] = []

/** Corre los fotogramas pedidos hasta ahora (los que pidan ellos, en la siguiente llamada). */
function siguienteFotograma() {
  const ahora = cola
  cola = []
  act(() => ahora.forEach((f) => f(performance.now())))
}

beforeEach(() => {
  cola = []
  fotograma.alPintar = []
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((f) => cola.push(f))
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('Lienzo3D', () => {
  it('primero pinta el aviso y monta el lienzo un fotograma después, para que el aviso se vea mientras se prepara', () => {
    render(<Lienzo3D><p>escena</p></Lienzo3D>)
    expect(screen.getByRole('status')).toHaveTextContent(PREPARANDO)
    expect(screen.queryByTestId('lienzo')).toBeNull()
    siguienteFotograma()
    expect(screen.queryByTestId('lienzo')).toBeNull()
    siguienteFotograma()
    expect(screen.getByTestId('lienzo')).toHaveTextContent('escena')
    expect(screen.getByRole('status')).toHaveTextContent(PREPARANDO)
  })

  it('quita el aviso cuando el primer fotograma de la escena ya se ha pintado', () => {
    render(<Lienzo3D><p>escena</p></Lienzo3D>)
    siguienteFotograma()
    siguienteFotograma()
    expect(fotograma.alPintar.length).toBeGreaterThan(0)
    act(() => fotograma.alPintar.at(-1)!())
    // El fotograma de la escena se está pintando: el aviso sigue hasta el siguiente.
    expect(screen.getByRole('status')).toHaveTextContent(PREPARANDO)
    siguienteFotograma()
    expect(screen.queryByText(PREPARANDO)).toBeNull()
    expect(screen.getByTestId('lienzo')).toBeInTheDocument()
  })
})
