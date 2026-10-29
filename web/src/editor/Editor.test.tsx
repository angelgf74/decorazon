// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { almacen, reiniciarAlmacen } from './estado/almacen'
import Editor from './Editor'

// Sin red o con un fragmento de un despliegue anterior, el import dinámico rechaza.
vi.mock('./vista3d/Vista3D', () => {
  throw new Error('Failed to fetch dynamically imported module')
})

beforeEach(() => {
  reiniciarAlmacen()
  almacen.getState().crear('salon', 400, 330, 250)
  almacen.getState().cambiarVista('3d')
})

describe('Editor: fragmento 3D', () => {
  it('si no se puede cargar, avisa y "Volver al 2D" vuelve al plano', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Editor />)
    expect(await screen.findByText('No se pudo cargar la vista 3D. El plano 2D sigue funcionando.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Volver al 2D' }))
    expect(almacen.getState().vista).toBe('2d')
  })
})
