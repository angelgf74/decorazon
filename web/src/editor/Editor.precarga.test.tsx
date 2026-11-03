// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { almacen, reiniciarAlmacen } from './estado/almacen'
import Editor from './Editor'

// Aparte de Editor.test: aquí el fragmento 3D sí carga, y un módulo cargado queda en caché para todo el fichero.
const precarga = vi.hoisted(() => ({ precargar: vi.fn() }))

vi.mock('./vista3d/precargar', () => ({ precargarVista3D: precarga.precargar }))
vi.mock('./vista3d/Vista3D', () => ({ default: () => <p>Vista 3D del lazy</p> }))

beforeEach(() => {
  reiniciarAlmacen()
  almacen.getState().crear('salon', 400, 330, 250)
  almacen.getState().cambiarVista('3d')
  precarga.precargar.mockReset().mockReturnValue(() => {})
})

describe('Editor: precarga del 3D con la vista 3D ya abierta', () => {
  it('no cambia el componente (lo remontaría entero, con la cámara y el contexto WebGL)', async () => {
    render(<Editor />, { wrapper: MemoryRouter })
    expect(await screen.findByText('Vista 3D del lazy')).toBeInTheDocument()
    const { alCargar } = precarga.precargar.mock.calls[0][0] as { alCargar: (m: { default: () => React.ReactNode }) => void }
    act(() => alCargar({ default: () => <p>Vista 3D precargada</p> }))
    expect(screen.getByText('Vista 3D del lazy')).toBeInTheDocument()
    expect(screen.queryByText('Vista 3D precargada')).toBeNull()
  })
})
