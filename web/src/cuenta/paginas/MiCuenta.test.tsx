// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reiniciarAlmacen } from '../../editor/estado/almacen'
import { CLAVE_DUENO_COPIAS, guardarCopiaLocal, PREFIJO_COPIA } from '../../editor/persistencia/local'
import { documentoNuevo } from '../../nucleo'
import { respuesta } from '../../pruebas/respuesta'
import NavegacionDeSesion from '../NavegacionDeSesion'
import { CLAVE_SESION, conectarSesionConApi, reiniciarSesion, sesion } from '../sesion'
import MiCuenta from './MiCuenta'

const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()
const MANANA = new Date(Date.now() + 86_400_000).toISOString()
const ACTUAL = 'la contraseña de ahora'
const NUEVA = 'una contraseña nueva larga'
const CLAVE_COPIA = `${PREFIJO_COPIA}abc`

function Donde() {
  const l = useLocation()
  return <p>en {l.pathname} {(l.state as { mensaje?: string } | null)?.mensaje}</p>
}

function montar() {
  render(
    <MemoryRouter initialEntries={['/cuenta']}>
      <NavegacionDeSesion />
      <Routes>
        <Route path="/cuenta" element={<MiCuenta />} />
        <Route path="*" element={<Donde />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function escribirCambio() {
  await userEvent.type(screen.getByLabelText('Contraseña actual'), ACTUAL)
  await userEvent.type(screen.getByLabelText('Contraseña nueva'), NUEVA)
  await userEvent.type(screen.getByLabelText('Repite la contraseña nueva'), NUEVA)
  await userEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: MANANA }))
  guardarCopiaLocal(localStorage, 'abc', { version: 1, nombre: 'x', documento: documentoNuevo('salon', 400, 330, 250), pendiente: false })
  localStorage.setItem(CLAVE_DUENO_COPIAS, 'ana@x.es')
  fetchSimulado.mockReset()
  vi.stubGlobal('fetch', fetchSimulado)
  reiniciarSesion()
  reiniciarAlmacen()
  conectarSesionConApi()
  sesion.setState({ usuario: { nombre: 'Ana', correo: 'ana@x.es', esAdministrador: false } })
})
afterEach(() => vi.unstubAllGlobals())

describe('MiCuenta', () => {
  it('muestra el nombre y el correo', () => {
    montar()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('ana@x.es')).toBeInTheDocument()
  })

  it('el enlace a la administración solo sale a quien administra', () => {
    montar()
    expect(screen.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument()
    act(() => sesion.setState({ usuario: { nombre: 'Ana', correo: 'ana@x.es', esAdministrador: true } }))
    expect(screen.getByRole('link', { name: 'Administración' })).toHaveAttribute('href', '/administracion')
  })

  it('cambiar la contraseña con 204 cierra la sesión, conserva las copias y va a Entrar', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(204))
    montar()
    await escribirCambio()
    expect(await screen.findByText('en /entrar Contraseña cambiada. Vuelve a entrar con la nueva.')).toBeInTheDocument()
    expect(sesion.getState().token).toBeNull()
    expect(localStorage.getItem(CLAVE_COPIA)).not.toBeNull()
    expect(localStorage.getItem(CLAVE_DUENO_COPIAS)).toBe('ana@x.es')
    const p = fetchSimulado.mock.calls[0][0]
    expect(p.method).toBe('POST')
    expect(p.url).not.toContain('larga')
    expect(await p.json()).toEqual({ actual: ACTUAL, nueva: NUEVA })
  })

  it('un 400 muestra el mensaje y mantiene la sesión', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(400, { mensaje: 'La contraseña actual no es correcta' }))
    montar()
    await escribirCambio()
    expect(await screen.findByText('La contraseña actual no es correcta')).toBeInTheDocument()
    expect(sesion.getState().token).toBe('jwt')
  })

  it('una nueva contraseña corta o distinta no envía', async () => {
    montar()
    await userEvent.type(screen.getByLabelText('Contraseña nueva'), 'corta')
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    expect(screen.getByText('La contraseña debe tener entre 12 y 128 caracteres')).toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('Contraseña nueva'))
    await userEvent.type(screen.getByLabelText('Contraseña nueva'), NUEVA)
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument()
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  it('cerrar sesión sin cambios pendientes cierra directamente y borra las copias', async () => {
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByText('en /')).toBeInTheDocument()
    expect(sesion.getState().token).toBeNull()
    expect(localStorage.getItem(CLAVE_COPIA)).toBeNull()
  })

  it('cerrar sesión con cambios sin subir pide confirmación', async () => {
    guardarCopiaLocal(localStorage, 'abc', { version: 1, nombre: 'x', documento: documentoNuevo('salon', 400, 330, 250), pendiente: true })
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(screen.getByText(/Tienes cambios que aún no se han guardado/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(sesion.getState().token).toBe('jwt')
    expect(screen.queryByText(/Tienes cambios que aún no se han guardado/)).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    const botones = screen.getAllByRole('button', { name: 'Cerrar sesión' })
    await userEvent.click(botones[botones.length - 1])
    expect(await screen.findByText('en /')).toBeInTheDocument()
    expect(sesion.getState().token).toBeNull()
    expect(localStorage.getItem(CLAVE_COPIA)).toBeNull()
  })

  it('borrar la cuenta pide confirmación y contraseña, la envía en el cuerpo y limpia el navegador', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(204))
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Borrar mi cuenta' }))
    expect(screen.getByText('Se borrarán tu cuenta y todos tus diseños. No se puede deshacer.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Borrar la cuenta' }))
    expect(screen.getByText('Escribe tu contraseña para borrar la cuenta')).toBeInTheDocument()
    expect(fetchSimulado).not.toHaveBeenCalled()
    await userEvent.type(screen.getByLabelText('Tu contraseña'), ACTUAL)
    await userEvent.click(screen.getByRole('button', { name: 'Borrar la cuenta' }))
    expect(await screen.findByText('en / Tu cuenta se ha borrado.')).toBeInTheDocument()
    const p = fetchSimulado.mock.calls[0][0]
    expect(p.method).toBe('DELETE')
    expect(decodeURIComponent(p.url)).not.toContain(ACTUAL)
    expect(await p.json()).toEqual({ contrasena: ACTUAL })
    expect(sesion.getState().token).toBeNull()
    expect(localStorage.getItem(CLAVE_COPIA)).toBeNull()
  })

  it('un error al borrar lo muestra y deja la cuenta', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(400, { mensaje: 'Contraseña incorrecta' }))
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Borrar mi cuenta' }))
    await userEvent.type(screen.getByLabelText('Tu contraseña'), 'mala')
    await userEvent.click(screen.getByRole('button', { name: 'Borrar la cuenta' }))
    expect(await screen.findByText('Contraseña incorrecta')).toBeInTheDocument()
    expect(sesion.getState().token).toBe('jwt')
  })

  it('con el borrado en vuelo no se puede cancelar y dos envíos mandan un solo DELETE', async () => {
    let terminar: (r: Response) => void = () => {}
    fetchSimulado.mockReturnValueOnce(new Promise<Response>((r) => { terminar = r }))
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Borrar mi cuenta' }))
    await userEvent.type(screen.getByLabelText('Tu contraseña'), ACTUAL)
    const borrar = screen.getByRole('button', { name: 'Borrar la cuenta' })
    fireEvent.click(borrar)
    fireEvent.click(borrar)
    fireEvent.submit(screen.getByLabelText('Tu contraseña').closest('form')!)
    expect(await screen.findByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Borrar la cuenta' })).toBeDisabled()
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(screen.getByText('Se borrarán tu cuenta y todos tus diseños. No se puede deshacer.')).toBeInTheDocument()
    expect(screen.getByLabelText('Tu contraseña')).toHaveValue(ACTUAL)
    terminar(respuesta(204))
    expect(await screen.findByText('en / Tu cuenta se ha borrado.')).toBeInTheDocument()
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })

  it('Enter en el campo de contraseña confirma el borrado', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(204))
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Borrar mi cuenta' }))
    await userEvent.type(screen.getByLabelText('Tu contraseña'), `${ACTUAL}{Enter}`)
    expect(await screen.findByText('en / Tu cuenta se ha borrado.')).toBeInTheDocument()
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })

  it('sin sesión lleva a Entrar', () => {
    localStorage.clear()
    reiniciarSesion()
    montar()
    expect(screen.getByText('en /entrar')).toBeInTheDocument()
  })
})
