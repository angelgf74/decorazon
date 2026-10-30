// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import NavegacionDeSesion from './NavegacionDeSesion'
import { CLAVE_SESION, reiniciarSesion, sesion } from './sesion'

function Donde() {
  const l = useLocation()
  return <p>en {l.pathname + l.search}</p>
}

function montar(ruta: string) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <NavegacionDeSesion />
      <Routes><Route path="*" element={<Donde />} /></Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: new Date(Date.now() + 86_400_000).toISOString() }))
  reiniciarSesion()
})

describe('NavegacionDeSesion', () => {
  it('al caducar la sesión lleva a Entrar con el aviso y la ruta actual', () => {
    montar('/disenos/abc?x=1')
    act(() => sesion.getState().cerrarSesion('caducada'))
    expect(screen.getByText(`en /entrar?motivo=caducada&volver=${encodeURIComponent('/disenos/abc?x=1')}`)).toBeInTheDocument()
  })

  it('desde una página de cuenta no guarda la ruta para volver', () => {
    montar('/entrar')
    act(() => sesion.getState().cerrarSesion('caducada'))
    expect(screen.getByText('en /entrar?motivo=caducada')).toBeInTheDocument()
  })

  it('cerrar la sesión a propósito no navega', () => {
    montar('/disenar')
    act(() => sesion.getState().cerrarSesion())
    expect(screen.getByText('en /disenar')).toBeInTheDocument()
  })
})
