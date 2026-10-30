// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/cliente'
import { respuesta } from '../pruebas/respuesta'
import { alCaducarLaSesion, CLAVE_SESION, conectarSesionConApi, reiniciarSesion, sesion } from './sesion'

const MANANA = new Date(Date.now() + 86_400_000).toISOString()
const AYER = new Date(Date.now() - 86_400_000).toISOString()

const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()

beforeEach(() => {
  localStorage.clear()
  fetchSimulado.mockReset()
  vi.stubGlobal('fetch', fetchSimulado)
  reiniciarSesion()
  conectarSesionConApi()
})
afterEach(() => vi.unstubAllGlobals())

describe('sesion', () => {
  it('iniciarSesion guarda el token y el usuario y persiste en decorazon.sesion', async () => {
    fetchSimulado
      .mockResolvedValueOnce(respuesta(200, { token: 'jwt', caducidad: MANANA }))
      .mockResolvedValueOnce(respuesta(200, { nombre: 'Ana', correo: 'ana@x.es' }))
    await sesion.getState().iniciarSesion('ana@x.es', 'una contraseña larga')
    const s = sesion.getState()
    expect(s.token).toBe('jwt')
    expect(s.usuario).toEqual({ nombre: 'Ana', correo: 'ana@x.es' })
    expect(s.haySesion()).toBe(true)
    expect(JSON.parse(localStorage.getItem(CLAVE_SESION)!)).toEqual({ token: 'jwt', caducidad: MANANA })
    const yo = fetchSimulado.mock.calls[1][0]
    expect(yo.url).toMatch(/\/cuentas\/yo$/)
    expect(yo.headers.get('Authorization')).toBe('Bearer jwt')
  })

  it('la contraseña va en el cuerpo y no en la URL', async () => {
    fetchSimulado
      .mockResolvedValueOnce(respuesta(200, { token: 'jwt', caducidad: MANANA }))
      .mockResolvedValueOnce(respuesta(200, { nombre: 'Ana', correo: 'ana@x.es' }))
    await sesion.getState().iniciarSesion('ana@x.es', 'una contraseña larga')
    const p = fetchSimulado.mock.calls[0][0]
    expect(p.method).toBe('POST')
    expect(p.url).not.toContain('larga')
    expect(await p.json()).toEqual({ correo: 'ana@x.es', contrasena: 'una contraseña larga' })
  })

  it('con credenciales malas lanza el mensaje de la API y no guarda nada', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta(401, { mensaje: 'Correo o contraseña incorrectos' }))
    await expect(sesion.getState().iniciarSesion('ana@x.es', 'mala')).rejects.toMatchObject({ estado: 401, mensaje: 'Correo o contraseña incorrectos' })
    expect(sesion.getState().token).toBeNull()
    expect(localStorage.getItem(CLAVE_SESION)).toBeNull()
  })

  it('se recupera del navegador al arrancar', () => {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: MANANA }))
    reiniciarSesion()
    expect(sesion.getState().token).toBe('jwt')
    expect(sesion.getState().haySesion()).toBe(true)
  })

  it('haySesion es falso con una caducidad pasada', () => {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: AYER }))
    reiniciarSesion()
    expect(sesion.getState().haySesion()).toBe(false)
  })

  it('un dato guardado que no es una sesión se ignora', () => {
    localStorage.setItem(CLAVE_SESION, '{"token":3}')
    reiniciarSesion()
    expect(sesion.getState().token).toBeNull()
  })

  it('cerrarSesion borra la clave, el token y el usuario', () => {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: MANANA }))
    reiniciarSesion()
    sesion.setState({ usuario: { nombre: 'Ana', correo: 'ana@x.es' } })
    sesion.getState().cerrarSesion()
    expect(localStorage.getItem(CLAVE_SESION)).toBeNull()
    expect(sesion.getState().token).toBeNull()
    expect(sesion.getState().usuario).toBeNull()
  })

  it('un 401 en cualquier llamada con token deja token null', async () => {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: MANANA }))
    reiniciarSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(401))
    await api.GET('/disenos')
    expect(sesion.getState().token).toBeNull()
    expect(localStorage.getItem(CLAVE_SESION)).toBeNull()
  })

  it('cargarUsuario rellena el usuario', async () => {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: MANANA }))
    reiniciarSesion()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, { nombre: 'Ana', correo: 'ana@x.es' }))
    await sesion.getState().cargarUsuario()
    expect(sesion.getState().usuario).toEqual({ nombre: 'Ana', correo: 'ana@x.es' })
  })
})

describe('sesion caducada', () => {
  it('cerrarSesion("caducada") avisa una sola vez aunque lleguen varios 401', async () => {
    const alCaducar = vi.fn()
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: MANANA }))
    reiniciarSesion()
    alCaducarLaSesion(alCaducar)
    fetchSimulado.mockImplementation(async () => respuesta(401))
    await Promise.all([api.GET('/disenos'), api.GET('/cuentas/yo')])
    expect(alCaducar).toHaveBeenCalledOnce()
  })

  it('cerrarSesion sin motivo no avisa de caducidad', () => {
    const alCaducar = vi.fn()
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: MANANA }))
    reiniciarSesion()
    alCaducarLaSesion(alCaducar)
    sesion.getState().cerrarSesion()
    expect(alCaducar).not.toHaveBeenCalled()
  })
})
