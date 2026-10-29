// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import BarraSuperior from './BarraSuperior'

beforeEach(() => {
  reiniciarAlmacen()
  almacen.getState().crear('salon', 400, 330, 250)
})

describe('BarraSuperior', () => {
  it('deshacer y rehacer están desactivados al crear', () => {
    render(<BarraSuperior />)
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Rehacer' })).toBeDisabled()
  })

  it('deshacer se activa tras un cambio', () => {
    almacen.getState().cambiar((d) => ({ ...d, estancia: { ...d.estancia, alto: 260 } }))
    render(<BarraSuperior />)
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeEnabled()
  })

  it('pulsar "2 Amueblar" pasa al paso 2 y lo marca', async () => {
    render(<BarraSuperior />)
    expect(screen.getByRole('button', { name: '1 Estancia' })).toHaveAttribute('aria-current', 'step')
    await userEvent.click(screen.getByRole('button', { name: '2 Amueblar' }))
    expect(almacen.getState().paso).toBe(2)
    expect(screen.getByRole('button', { name: '2 Amueblar' })).toHaveAttribute('aria-current', 'step')
  })

  it('el botón 3D está desactivado y explica por qué', () => {
    render(<BarraSuperior />)
    const b = screen.getByRole('button', { name: '3D' })
    expect(b).toBeDisabled()
    expect(b).toHaveAccessibleDescription('La vista 3D llega pronto')
  })

  it('"Nuevo diseño" pide confirmación y descarta', async () => {
    render(<BarraSuperior />)
    await userEvent.click(screen.getByRole('button', { name: 'Nuevo diseño' }))
    expect(screen.getByText(/reemplaza tu diseño actual/)).toBeInTheDocument()
    expect(almacen.getState().documento).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar' }))
    expect(almacen.getState().documento).toBeNull()
  })

  it('cancelar no descarta', async () => {
    render(<BarraSuperior />)
    await userEvent.click(screen.getByRole('button', { name: 'Nuevo diseño' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(almacen.getState().documento).not.toBeNull()
  })

  it('muestra el estado de guardado', () => {
    almacen.getState().marcarGuardado('error')
    render(<BarraSuperior />)
    expect(screen.getByText('No se pudo guardar en este navegador')).toBeInTheDocument()
  })
})
