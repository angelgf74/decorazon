// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAVE_SESION, reiniciarSesion, sesion } from '../../cuenta/sesion'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import BarraSuperior from './BarraSuperior'

const sincronizacion = vi.hoisted(() => ({ renombrar: vi.fn() }))
vi.mock('../persistencia/sincronizacion', () => sincronizacion)

beforeEach(() => {
  localStorage.clear()
  reiniciarSesion()
  reiniciarAlmacen()
  almacen.getState().crear('salon', 400, 330, 250)
})

describe('BarraSuperior', () => {
  it('deshacer y rehacer están desactivados al crear', () => {
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Rehacer' })).toBeDisabled()
  })

  it('deshacer se activa tras un cambio', () => {
    almacen.getState().cambiar((d) => ({ ...d, estancia: { ...d.estancia, alto: 260 } }))
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeEnabled()
  })

  it('pulsar "2 Amueblar" pasa al paso 2 y lo marca', async () => {
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    expect(screen.getByRole('button', { name: '1 Estancia' })).toHaveAttribute('aria-current', 'step')
    await userEvent.click(screen.getByRole('button', { name: '2 Amueblar' }))
    expect(almacen.getState().paso).toBe(2)
    expect(screen.getByRole('button', { name: '2 Amueblar' })).toHaveAttribute('aria-current', 'step')
  })

  it('el botón 3D está activado y cambia a la vista 3D', async () => {
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    const b = screen.getByRole('button', { name: '3D' })
    expect(b).toBeEnabled()
    expect(screen.queryByText('La vista 3D llega pronto')).toBeNull()
    await userEvent.click(b)
    expect(almacen.getState().vista).toBe('3d')
    expect(b).toHaveAttribute('aria-pressed', 'true')
  })

  it('"Nuevo diseño" pide confirmación y descarta', async () => {
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Nuevo diseño' }))
    expect(screen.getByText(/reemplaza tu diseño actual/)).toBeInTheDocument()
    expect(almacen.getState().documento).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar' }))
    expect(almacen.getState().documento).toBeNull()
  })

  it('cancelar no descarta', async () => {
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Nuevo diseño' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(almacen.getState().documento).not.toBeNull()
  })

  it('muestra el estado de guardado', () => {
    almacen.getState().marcarGuardado('error')
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    expect(screen.getByText('No se pudo guardar en este navegador')).toBeInTheDocument()
  })

  it('sin sesión ofrece entrar', () => {
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar')
    expect(screen.queryByRole('link', { name: 'Mis diseños' })).toBeNull()
  })

  it('sin sesión "Guardar" lleva al registro', () => {
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    expect(screen.getByRole('link', { name: 'Guardar' })).toHaveAttribute('href', '/registro')
  })

  it('con sesión no ofrece "Guardar"', () => {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: new Date(Date.now() + 86_400_000).toISOString() }))
    reiniciarSesion()
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    expect(screen.queryByRole('link', { name: 'Guardar' })).toBeNull()
  })

  it('con sesión ofrece Mis diseños y el nombre enlaza a la cuenta', () => {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: new Date(Date.now() + 86_400_000).toISOString() }))
    reiniciarSesion()
    sesion.setState({ usuario: { nombre: 'Ana', correo: 'ana@x.es' } })
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    expect(screen.getByRole('link', { name: 'Mis diseños' })).toHaveAttribute('href', '/disenos')
    expect(screen.getByRole('link', { name: 'Ana' })).toHaveAttribute('href', '/cuenta')
    expect(screen.queryByRole('link', { name: 'Entrar' })).toBeNull()
  })

  describe('con un diseño del servidor', () => {
    beforeEach(() => {
      sincronizacion.renombrar.mockClear()
      almacen.getState().abrirDelServidor('d1', 4, 'Cocina', almacen.getState().documento!)
    })

    it.each([
      ['guardado', 'Guardado'],
      ['pendiente', 'Guardando…'],
      ['sinConexion', 'Sin conexión'],
      ['conflicto', 'Cambiado en otro sitio'],
      ['error', 'No se pudo guardar'],
    ] as const)('el indicador con "%s" dice "%s"', (g, texto) => {
      almacen.getState().marcarGuardado(g)
      render(<BarraSuperior />, { wrapper: MemoryRouter })
      expect(screen.getByRole('status')).toHaveTextContent(new RegExp(`^${texto}$`))
    })

    it('no ofrece "Nuevo diseño"', () => {
      render(<BarraSuperior />, { wrapper: MemoryRouter })
      expect(screen.queryByRole('button', { name: 'Nuevo diseño' })).toBeNull()
    })

    it('el nombre se edita y renombra al pulsar Intro; Escape lo deja como estaba', async () => {
      render(<BarraSuperior />, { wrapper: MemoryRouter })
      const campo = screen.getByRole('textbox', { name: 'Nombre del diseño' })
      expect(campo).toHaveValue('Cocina')
      await userEvent.clear(campo)
      await userEvent.type(campo, 'Otra{Escape}')
      expect(campo).toHaveValue('Cocina')
      expect(sincronizacion.renombrar).not.toHaveBeenCalled()
      await userEvent.clear(campo)
      await userEvent.type(campo, 'Cocina nueva{Enter}')
      expect(sincronizacion.renombrar).toHaveBeenCalledWith(almacen, 'Cocina nueva')
    })
  })
})
