// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/cliente'
import { respuesta } from '../pruebas/respuesta'
import { almacen, reiniciarAlmacen } from '../editor/estado/almacen'
import { CLAVE_DESCARTADO, CLAVE_DISENO, CLAVE_DUENO_COPIAS, CLAVE_REGISTRO_ENVIADO, guardarDisenoLocal } from '../editor/persistencia/local'
import { documentoNuevo } from '../nucleo'
import { conectarSincronizacion } from '../editor/persistencia/sincronizacion'
import { alCaducarLaSesion, alSalirDeLaSesion, CLAVE_SESION, conectarCargaDeUsuario, conectarSesionConApi, conectarSesionEntrePestanas, reiniciarSesion, sesion } from './sesion'

const MANANA = new Date(Date.now() + 86_400_000).toISOString()
const AYER = new Date(Date.now() - 86_400_000).toISOString()

const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()

beforeEach(() => {
  localStorage.clear()
  fetchSimulado.mockReset()
  vi.stubGlobal('fetch', fetchSimulado)
  reiniciarSesion()
  reiniciarAlmacen()
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
    expect(JSON.parse(localStorage.getItem(CLAVE_SESION)!)).toEqual({ token: 'jwt', caducidad: MANANA, correo: 'ana@x.es' })
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

  it('iniciarSesion no toca la sesión guardada hasta tener la nueva: las otras pestañas no se cierran por entrar', async () => {
    const guardada = JSON.stringify({ token: 'viejo', caducidad: MANANA, correo: 'ana@x.es' })
    localStorage.setItem(CLAVE_SESION, guardada)
    reiniciarSesion()
    let duranteElPost: string | null = null
    fetchSimulado.mockImplementationOnce(async () => {
      duranteElPost = localStorage.getItem(CLAVE_SESION)
      return respuesta(401, { mensaje: 'Correo o contraseña incorrectos' })
    })
    await expect(sesion.getState().iniciarSesion('ana@x.es', 'mala')).rejects.toMatchObject({ estado: 401 })
    expect(duranteElPost).toBe(guardada)
    expect(localStorage.getItem(CLAVE_SESION)).toBe(guardada)
    expect(sesion.getState().token).toBeNull()
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

describe('sesion caducada por tiempo y 401 antiguos', () => {
  it('con la caducidad pasada, una llamada protegida cierra la sesión por caducidad una vez', async () => {
    const alCaducar = vi.fn()
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: AYER }))
    reiniciarSesion()
    alCaducarLaSesion(alCaducar)
    fetchSimulado.mockImplementation(async () => respuesta(200, []))
    await Promise.all([api.GET('/disenos'), api.GET('/disenos')])
    await Promise.resolve()
    expect(fetchSimulado.mock.calls[0][0].headers.has('Authorization')).toBe(false)
    expect(alCaducar).toHaveBeenCalledOnce()
    expect(sesion.getState().token).toBeNull()
    expect(localStorage.getItem(CLAVE_SESION)).toBeNull()
  })

  it('un 401 de una petición con el token anterior no cierra la sesión nueva', async () => {
    const alCaducar = vi.fn()
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'viejo', caducidad: MANANA }))
    reiniciarSesion()
    alCaducarLaSesion(alCaducar)
    let responder: (r: Response) => void = () => {}
    fetchSimulado.mockImplementationOnce(() => new Promise<Response>((r) => { responder = r }))
    const enVuelo = api.GET('/disenos')
    await vi.waitFor(() => expect(fetchSimulado).toHaveBeenCalledOnce())
    fetchSimulado
      .mockResolvedValueOnce(respuesta(200, { token: 'nuevo', caducidad: MANANA }))
      .mockResolvedValueOnce(respuesta(200, { nombre: 'Ana', correo: 'ana@x.es' }))
    await sesion.getState().iniciarSesion('ana@x.es', 'una contraseña larga')
    responder(respuesta(401))
    await enVuelo
    expect(sesion.getState().token).toBe('nuevo')
    expect(alCaducar).not.toHaveBeenCalled()
  })
})

describe('diseños del navegador al salir y al entrar', () => {
  const doc = documentoNuevo('salon', 400, 330, 250)
  const clavesDeDiseno = () => Object.keys(localStorage).filter((k) => k.startsWith('decorazon.diseno')).sort()

  function conDisenosLocales() {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: MANANA }))
    reiniciarSesion()
    localStorage.setItem('decorazon.diseno.a', '{}')
    localStorage.setItem('decorazon.diseno.b', '{}')
    localStorage.setItem(CLAVE_DUENO_COPIAS, 'ana@x.es')
    guardarDisenoLocal(localStorage, doc)
    almacen.getState().cargar(doc)
  }

  function entrarComo(correo: string) {
    fetchSimulado
      .mockResolvedValueOnce(respuesta(200, { token: 'otro', caducidad: MANANA }))
      .mockResolvedValueOnce(respuesta(200, { nombre: 'X', correo }))
    return sesion.getState().iniciarSesion(correo, 'una contraseña larga')
  }

  it('cerrarSesion borra las copias y el diseño anónimo, vacía el editor y lleva al inicio', () => {
    conDisenosLocales()
    localStorage.setItem(CLAVE_DESCARTADO, '{roto')
    localStorage.setItem(CLAVE_REGISTRO_ENVIADO, '{}')
    const alSalir = vi.fn()
    alSalirDeLaSesion(alSalir)
    sesion.getState().cerrarSesion()
    expect(clavesDeDiseno()).toEqual([])
    expect(localStorage.getItem(CLAVE_DUENO_COPIAS)).toBeNull()
    expect(localStorage.getItem(CLAVE_REGISTRO_ENVIADO)).toBeNull()
    expect(almacen.getState().documento).toBeNull()
    expect(alSalir).toHaveBeenCalledOnce()
  })

  it('cerrarSesion con un diseño del servidor abierto vuelve al editor anónimo vacío', () => {
    conDisenosLocales()
    almacen.getState().abrirDelServidor('a', 3, 'Cocina', doc)
    sesion.getState().cerrarSesion()
    expect(almacen.getState().origen.tipo).toBe('anonimo')
    expect(almacen.getState().documento).toBeNull()
  })

  it('cerrarSesion("caducada") conserva las copias y el diseño anónimo y no lleva al inicio', () => {
    conDisenosLocales()
    const alSalir = vi.fn()
    alSalirDeLaSesion(alSalir)
    sesion.getState().cerrarSesion('caducada')
    expect(clavesDeDiseno()).toEqual(['decorazon.diseno.a', 'decorazon.diseno.b', CLAVE_DISENO])
    expect(almacen.getState().documento).not.toBeNull()
    expect(alSalir).not.toHaveBeenCalled()
  })

  it('entrar con otra cuenta borra las copias de la anterior y conserva el diseño anónimo', async () => {
    conDisenosLocales()
    sesion.getState().cerrarSesion('caducada')
    await entrarComo('luis@x.es')
    expect(clavesDeDiseno()).toEqual([CLAVE_DISENO])
    expect(localStorage.getItem(CLAVE_DUENO_COPIAS)).toBe('luis@x.es')
  })

  it('entrar con la misma cuenta conserva sus copias', async () => {
    conDisenosLocales()
    sesion.getState().cerrarSesion('caducada')
    await entrarComo('ana@x.es')
    expect(clavesDeDiseno()).toEqual(['decorazon.diseno.a', 'decorazon.diseno.b', CLAVE_DISENO])
  })

  it('las copias sin dueño conocido se borran al entrar', async () => {
    localStorage.setItem('decorazon.diseno.a', '{}')
    await entrarComo('ana@x.es')
    expect(clavesDeDiseno()).toEqual([])
    expect(localStorage.getItem(CLAVE_DUENO_COPIAS)).toBe('ana@x.es')
  })
})

describe('cierre de sesión en otra pestaña', () => {
  const doc = documentoNuevo('cocina', 400, 300, 250)
  const desconectar: Array<() => void> = []
  afterEach(() => {
    desconectar.splice(0).forEach((d) => d())
    vi.useRealTimers()
  })

  function conDisenoDelServidorAbierto() {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: MANANA, correo: 'ana@x.es' }))
    reiniciarSesion()
    localStorage.setItem('decorazon.diseno.a', '{}')
    localStorage.setItem(CLAVE_DUENO_COPIAS, 'ana@x.es')
    guardarDisenoLocal(localStorage, doc)
    almacen.getState().abrirDelServidor('a', 4, 'Cocina', doc)
    desconectar.push(conectarSesionEntrePestanas())
  }

  function enOtraPestana(nuevo: string | null, clave: string | null = CLAVE_SESION) {
    if (clave === CLAVE_SESION) {
      if (nuevo === null) localStorage.removeItem(CLAVE_SESION)
      else localStorage.setItem(CLAVE_SESION, nuevo)
    }
    window.dispatchEvent(new StorageEvent('storage', { key: clave, newValue: nuevo }))
  }

  const claves = () => Object.keys(localStorage).sort()

  it('si otra pestaña cierra la sesión: esta la olvida, vuelve al anónimo y al inicio, sin borrar nada más', () => {
    conDisenoDelServidorAbierto()
    const alSalir = vi.fn()
    alSalirDeLaSesion(alSalir)
    const antes = claves().filter((k) => k !== CLAVE_SESION)
    enOtraPestana(null)
    expect(sesion.getState().token).toBeNull()
    expect(almacen.getState().origen.tipo).toBe('anonimo')
    expect(almacen.getState().documento).toEqual(doc)
    expect(alSalir).toHaveBeenCalledTimes(1)
    expect(claves()).toEqual(antes)
  })

  it('si otra pestaña entra con otro token: cierre local y no toca la sesión nueva ni sus copias', () => {
    conDisenoDelServidorAbierto()
    const alSalir = vi.fn()
    alSalirDeLaSesion(alSalir)
    const otra = JSON.stringify({ token: 'otro', caducidad: MANANA })
    enOtraPestana(otra)
    expect(sesion.getState().token).toBeNull()
    expect(alSalir).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(CLAVE_SESION)).toBe(otra)
    expect(localStorage.getItem('decorazon.diseno.a')).toBe('{}')
  })

  it('si otra pestaña entra con otra cuenta (otro correo): cierre local', () => {
    conDisenoDelServidorAbierto()
    const alSalir = vi.fn()
    alSalirDeLaSesion(alSalir)
    enOtraPestana(JSON.stringify({ token: 'otro', caducidad: MANANA, correo: 'luis@x.es' }))
    expect(sesion.getState().token).toBeNull()
    expect(almacen.getState().origen.tipo).toBe('anonimo')
    expect(alSalir).toHaveBeenCalledTimes(1)
  })

  it('si otra pestaña entra con la misma cuenta (otro token): adopta el token nuevo sin cerrar ni soltar el diseño', () => {
    conDisenoDelServidorAbierto()
    const alSalir = vi.fn()
    alSalirDeLaSesion(alSalir)
    const pasadoManana = new Date(Date.now() + 2 * 86_400_000).toISOString()
    enOtraPestana(JSON.stringify({ token: 'nuevo', caducidad: pasadoManana, correo: 'ana@x.es' }))
    expect(sesion.getState().token).toBe('nuevo')
    expect(sesion.getState().caducidad).toBe(pasadoManana)
    expect(sesion.getState().haySesion()).toBe(true)
    expect(almacen.getState().origen.tipo).toBe('servidor')
    expect(alSalir).not.toHaveBeenCalled()
  })

  it('el mismo token reescrito, otra clave o esta pestaña sin sesión: no hace nada', () => {
    conDisenoDelServidorAbierto()
    const alSalir = vi.fn()
    alSalirDeLaSesion(alSalir)
    enOtraPestana(JSON.stringify({ token: 'jwt', caducidad: MANANA }))
    enOtraPestana('x', 'decorazon.otra')
    expect(sesion.getState().token).toBe('jwt')
    expect(almacen.getState().origen.tipo).toBe('servidor')
    sesion.setState({ token: null, caducidad: null })
    enOtraPestana(null)
    expect(alSalir).not.toHaveBeenCalled()
  })

  it('un localStorage.clear() en otra pestaña también cierra la sesión aquí', () => {
    conDisenoDelServidorAbierto()
    localStorage.clear()
    window.dispatchEvent(new StorageEvent('storage', { key: null }))
    expect(sesion.getState().token).toBeNull()
    expect(almacen.getState().origen.tipo).toBe('anonimo')
  })

  it('lo pendiente de esta pestaña no se sube con la sesión ya cerrada', async () => {
    vi.useFakeTimers()
    desconectar.push(conectarSincronizacion(almacen, { esperaMs: 2000, st: localStorage }))
    conDisenoDelServidorAbierto()
    almacen.getState().cambiar((d) => ({ ...d, estancia: { ...d.estancia, alto: 260 } }))
    enOtraPestana(null)
    await vi.advanceTimersByTimeAsync(5000)
    expect(fetchSimulado).not.toHaveBeenCalled()
  })
})

describe('carga del usuario al volver la red', () => {
  const desconectar: Array<() => void> = []
  afterEach(() => desconectar.splice(0).forEach((d) => d()))

  function conSesionGuardada() {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: MANANA }))
    reiniciarSesion()
  }

  it('sin red al arrancar, el nombre se carga cuando vuelve la conexión', async () => {
    conSesionGuardada()
    fetchSimulado
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(respuesta(200, { nombre: 'Ana', correo: 'ana@x.es' }))
    desconectar.push(conectarCargaDeUsuario())
    await vi.waitFor(() => expect(fetchSimulado).toHaveBeenCalledOnce())
    expect(sesion.getState().usuario).toBeNull()
    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() => expect(sesion.getState().usuario?.nombre).toBe('Ana'))
  })

  it('con el usuario ya cargado, online no vuelve a pedirlo', async () => {
    conSesionGuardada()
    fetchSimulado.mockResolvedValueOnce(respuesta(200, { nombre: 'Ana', correo: 'ana@x.es' }))
    desconectar.push(conectarCargaDeUsuario())
    await vi.waitFor(() => expect(sesion.getState().usuario?.nombre).toBe('Ana'))
    window.dispatchEvent(new Event('online'))
    expect(fetchSimulado).toHaveBeenCalledOnce()
  })

  it('sin sesión no pide nada, ni al arrancar ni al volver la red', () => {
    desconectar.push(conectarCargaDeUsuario())
    window.dispatchEvent(new Event('online'))
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  it('varios online mientras una carga sigue en curso no duplican la petición', async () => {
    conSesionGuardada()
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    desconectar.push(conectarCargaDeUsuario())
    await vi.waitFor(() => expect(fetchSimulado).toHaveBeenCalledOnce())
    fetchSimulado.mockImplementation(() => new Promise<Response>(() => {}))
    window.dispatchEvent(new Event('online'))
    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() => expect(fetchSimulado).toHaveBeenCalledTimes(2))
    await new Promise((r) => setTimeout(r, 20))
    expect(fetchSimulado).toHaveBeenCalledTimes(2)
  })

  it('la función devuelta quita el listener', async () => {
    conSesionGuardada()
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const desconectarCarga = conectarCargaDeUsuario()
    await vi.waitFor(() => expect(fetchSimulado).toHaveBeenCalledOnce())
    desconectarCarga()
    window.dispatchEvent(new Event('online'))
    await new Promise((r) => setTimeout(r, 20))
    expect(fetchSimulado).toHaveBeenCalledOnce()
  })
})
