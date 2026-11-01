// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { CLAVE_SESION, reiniciarSesion } from '../cuenta/sesion'
import { almacen, reiniciarAlmacen } from '../editor/estado/almacen'
import Inicio from './Inicio'

function montar() {
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/disenar" element={<p>pantalla del editor</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  reiniciarSesion()
  reiniciarAlmacen()
})

describe('Inicio', () => {
  it('sin documento ofrece empezar', () => {
    montar()
    expect(screen.getByRole('link', { name: 'Empezar a diseñar' })).toHaveAttribute('href', '/disenar')
    expect(screen.queryByText('Empezar uno nuevo')).not.toBeInTheDocument()
  })

  it('con documento ofrece seguir y empezar uno nuevo', () => {
    almacen.getState().crear('salon', 400, 330, 250)
    montar()
    expect(screen.getByRole('link', { name: 'Seguir con tu diseño' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Empezar uno nuevo' })).toBeInTheDocument()
  })

  it('"Empezar uno nuevo" confirma, descarta y navega', async () => {
    almacen.getState().crear('salon', 400, 330, 250)
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Empezar uno nuevo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar' }))
    expect(almacen.getState().documento).toBeNull()
    expect(screen.getByText('pantalla del editor')).toBeInTheDocument()
  })

  it('sin sesión ofrece entrar o crear cuenta, y no Mis diseños', () => {
    montar()
    const cuenta = screen.getByRole('region', { name: '¿Ya tienes cuenta?' })
    expect(within(cuenta).getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar')
    expect(within(cuenta).getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/registro')
    expect(screen.queryByRole('link', { name: 'Mis diseños' })).toBeNull()
  })

  it('con sesión ofrece Mis diseños y Mi cuenta, y no Entrar', () => {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: new Date(Date.now() + 86_400_000).toISOString() }))
    reiniciarSesion()
    montar()
    const cuenta = screen.getByRole('region', { name: 'Tu cuenta' })
    expect(within(cuenta).getByRole('link', { name: 'Mis diseños' })).toHaveAttribute('href', '/disenos')
    expect(within(cuenta).getByRole('link', { name: 'Mi cuenta' })).toHaveAttribute('href', '/cuenta')
    expect(screen.queryByRole('link', { name: 'Entrar' })).toBeNull()
  })

  it('"Empezar a diseñar" sigue siendo la acción principal, antes que la cuenta', () => {
    montar()
    const empezar = screen.getByRole('link', { name: 'Empezar a diseñar' })
    expect(empezar).toHaveClass('primario')
    expect(empezar.compareDocumentPosition(screen.getByRole('link', { name: 'Entrar' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
