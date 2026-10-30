// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { almacen, reiniciarAlmacen } from './estado/almacen'
import Editor from './Editor'

const carga = vi.hoisted(() => ({ fallosPendientes: 0 }))

// Sin red o con un fragmento de un despliegue anterior, el import dinámico rechaza.
vi.mock('./vista3d/Vista3D', () => {
  if (carga.fallosPendientes > 0) {
    carga.fallosPendientes--
    throw new Error('Failed to fetch dynamically imported module')
  }
  return { default: () => <p>Vista 3D cargada</p> }
})

const SIN_CARGA = 'No se pudo cargar la vista 3D. El plano 2D sigue funcionando.'

beforeEach(() => {
  reiniciarAlmacen()
  almacen.getState().crear('salon', 400, 330, 250)
  almacen.getState().cambiarVista('3d')
  carga.fallosPendientes = 1
})

describe('Editor: fragmento 3D', () => {
  it('si no se puede cargar, avisa y "Volver al 2D" vuelve al plano', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Editor />)
    expect(await screen.findByText(SIN_CARGA)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Volver al 2D' }))
    expect(almacen.getState().vista).toBe('2d')
  })

  it('tras un fallo, volver a pulsar 3D reintenta la carga', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Editor />)
    expect(await screen.findByText(SIN_CARGA)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Volver al 2D' }))
    act(() => almacen.getState().cambiarVista('3d'))
    expect(await screen.findByText('Vista 3D cargada')).toBeInTheDocument()
    expect(screen.queryByText(SIN_CARGA)).toBeNull()
  })
})
