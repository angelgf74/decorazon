// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { respuesta } from '../../pruebas/respuesta'
import { almacen, reiniciarAlmacen } from '../../editor/estado/almacen'
import { CLAVE_DISENO, CLAVE_REGISTRO_ENVIADO, guardarDisenoLocal } from '../../editor/persistencia/local'
import { catalogoBase, documentoNuevo, elementoNuevo, serializarDocumento, type DocumentoDiseno } from '../../nucleo'
import { alCaducarLaSesion, CLAVE_SESION, conectarSesionConApi, reiniciarSesion, sesion } from '../sesion'
import Entrar from './Entrar'

const MANANA = new Date(Date.now() + 86_400_000).toISOString()
const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()

function montar(busqueda: string, estado?: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/entrar', search: busqueda, state: estado }]}>
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/disenos" element={<p>mis diseños</p>} />
        <Route path="/disenos/abc" element={<p>diseño abc</p>} />
        <Route path="/disenos/d9" element={<p>diseño d9</p>} />
        <Route path="*" element={<p>otra página</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

/** `despues`: respuestas de las peticiones que siguen a entrar (un Error simula la falta de red). */
async function entrarConExito(...despues: (Response | Error)[]) {
  fetchSimulado
    .mockResolvedValueOnce(respuesta(200, { token: 'jwt', caducidad: MANANA }))
    .mockResolvedValueOnce(respuesta(200, { nombre: 'Ana', correo: 'ana@x.es' }))
  for (const r of despues) {
    if (r instanceof Error) fetchSimulado.mockRejectedValueOnce(r)
    else fetchSimulado.mockResolvedValueOnce(r)
  }
  await userEvent.type(screen.getByLabelText('Correo'), 'ana@x.es')
  await userEvent.type(screen.getByLabelText('Contraseña'), 'una contraseña larga')
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

beforeEach(() => {
  localStorage.clear()
  fetchSimulado.mockReset()
  vi.stubGlobal('fetch', fetchSimulado)
  reiniciarSesion()
  reiniciarAlmacen()
  conectarSesionConApi()
})
afterEach(() => vi.unstubAllGlobals())

describe('Entrar', () => {
  it('con credenciales malas muestra el mensaje de la API', async () => {
    montar('')
    fetchSimulado.mockResolvedValueOnce(respuesta(401, { mensaje: 'Correo o contraseña incorrectos' }))
    await userEvent.type(screen.getByLabelText('Correo'), 'ana@x.es')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'mala')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Correo o contraseña incorrectos')).toBeInTheDocument()
  })

  it('sin volver va a /disenos', async () => {
    montar('')
    await entrarConExito()
    expect(await screen.findByText('mis diseños')).toBeInTheDocument()
  })

  it('con ?volver=/disenos/abc navega allí al entrar', async () => {
    montar('?volver=%2Fdisenos%2Fabc')
    await entrarConExito()
    expect(await screen.findByText('diseño abc')).toBeInTheDocument()
  })

  it.each(['//evil.com', '/\\evil.com', '/\t/evil.com', 'https://evil.com', 'disenos'])('?volver=%s se ignora', async (volver) => {
    montar(`?volver=${encodeURIComponent(volver)}`)
    await entrarConExito()
    expect(await screen.findByText('mis diseños')).toBeInTheDocument()
  })

  it('con ?motivo=caducada avisa de que la sesión ha caducado', () => {
    montar('?motivo=caducada')
    expect(screen.getByText('Tu sesión ha caducado. Vuelve a entrar.')).toBeInTheDocument()
  })

  it('muestra el mensaje que trae de otra página', () => {
    montar('', { mensaje: 'Contraseña cambiada' })
    expect(screen.getByText('Contraseña cambiada')).toBeInTheDocument()
  })

  it('enlaza a la contraseña olvidada y a crear cuenta', () => {
    montar('')
    expect(screen.getByRole('link', { name: '¿Has olvidado la contraseña?' })).toHaveAttribute('href', '/contrasena/olvido')
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/registro')
  })

  it('con una sesión válida previa, unas credenciales malas no cierran por caducidad ni navegan', async () => {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'previo', caducidad: MANANA }))
    reiniciarSesion()
    const alCaducar = vi.fn()
    alCaducarLaSesion(alCaducar)
    montar('?volver=%2Fdisenos%2Fabc')
    fetchSimulado.mockResolvedValueOnce(respuesta(401, { mensaje: 'Correo o contraseña incorrectos' }))
    await userEvent.type(screen.getByLabelText('Correo'), 'ana@x.es')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'mala')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Correo o contraseña incorrectos')).toBeInTheDocument()
    expect(fetchSimulado.mock.calls[0][0].headers.has('Authorization')).toBe(false)
    expect(alCaducar).not.toHaveBeenCalled()
    expect(screen.queryByText('diseño abc')).toBeNull()
    expect(sesion.getState().token).toBeNull()
  })
})

describe('Entrar con un diseño anónimo', () => {
  const base = documentoNuevo('salon', 400, 330, 250)
  const conElemento: DocumentoDiseno = { ...base, elementos: [elementoNuevo(catalogoBase.get('armario')!, { x: 50, y: 50 }, 'e1')] }

  function conAnonimo(doc: DocumentoDiseno) {
    guardarDisenoLocal(localStorage, doc)
    almacen.getState().cargar(doc)
  }

  function creado(id: string, doc: DocumentoDiseno) {
    return respuesta(201, {
      id, nombre: 'Diseño sin título', tipoEstancia: 'salon', fechaDeCreacion: '2026-01-01T00:00:00Z',
      fechaDeModificacion: '2026-01-01T00:00:00Z', version: 1, contenido: doc,
    })
  }

  it('pregunta si guardarlo; "Sí" lo crea en la cuenta, descarta el anónimo y abre el diseño', async () => {
    conAnonimo(conElemento)
    montar('')
    await entrarConExito()
    expect(await screen.findByText('¿Guardar este diseño en tu cuenta?')).toBeInTheDocument()
    fetchSimulado.mockResolvedValueOnce(creado('d9', conElemento))
    await userEvent.click(screen.getByRole('button', { name: 'Sí, guardarlo' }))
    expect(await screen.findByText('diseño d9')).toBeInTheDocument()
    const peticion = fetchSimulado.mock.calls[2][0]
    expect(peticion.method).toBe('POST')
    expect(peticion.url).toMatch(/\/disenos$/)
    expect(await peticion.json()).toMatchObject({ nombre: 'Diseño sin título', tipoEstancia: 'salon', contenido: { elementos: [{ id: 'e1' }] } })
    expect(localStorage.getItem(CLAVE_DISENO)).toBeNull()
    expect(almacen.getState().documento).toBeNull()
  })

  it('con 409 avisa del límite y el diseño anónimo sigue en el navegador', async () => {
    conAnonimo(conElemento)
    montar('')
    await entrarConExito()
    fetchSimulado.mockResolvedValueOnce(respuesta(409, { mensaje: 'Has llegado al límite de 100 diseños' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Sí, guardarlo' }))
    expect(await screen.findByText('Has llegado al límite de 100 diseños. Tu diseño sigue en este navegador.')).toBeInTheDocument()
    expect(localStorage.getItem(CLAVE_DISENO)).not.toBeNull()
    expect(almacen.getState().documento).toEqual(conElemento)
    await userEvent.click(screen.getByRole('link', { name: 'Continuar' }))
    expect(await screen.findByText('mis diseños')).toBeInTheDocument()
  })

  it('"No" descarta el anónimo y sigue a donde iba', async () => {
    conAnonimo(conElemento)
    montar('')
    await entrarConExito()
    await userEvent.click(await screen.findByRole('button', { name: 'No, descartarlo' }))
    expect(await screen.findByText('mis diseños')).toBeInTheDocument()
    expect(fetchSimulado).toHaveBeenCalledTimes(2)
    expect(localStorage.getItem(CLAVE_DISENO)).toBeNull()
    expect(almacen.getState().documento).toBeNull()
  })

  function resumen(id: string, nombre: string) {
    return { id, nombre, tipoEstancia: 'salon', fechaDeCreacion: '2026-01-01T00:00:00Z', fechaDeModificacion: '2026-01-01T00:00:00Z', version: 1 }
  }

  function diseno(id: string, nombre: string, contenido: unknown) {
    return respuesta(200, { ...resumen(id, nombre), contenido })
  }

  // jsonb devuelve las claves en otro orden.
  function clavesAlReves(valor: unknown): unknown {
    if (Array.isArray(valor)) return valor.map(clavesAlReves)
    if (typeof valor !== 'object' || valor === null) return valor
    return Object.fromEntries(Object.entries(valor).reverse().map(([k, v]) => [k, clavesAlReves(v)]))
  }

  it('si ya se envió con el registro y la cuenta lo tiene, no pregunta, lo descarta y borra la marca', async () => {
    conAnonimo(conElemento)
    localStorage.setItem(CLAVE_REGISTRO_ENVIADO, serializarDocumento(conElemento))
    montar('')
    await entrarConExito(
      respuesta(200, [resumen('otro', 'Cocina'), resumen('d1', 'Mi primer diseño')]),
      diseno('d1', 'Mi primer diseño', clavesAlReves(conElemento)),
    )
    expect(await screen.findByText('mis diseños')).toBeInTheDocument()
    expect(screen.queryByText('¿Guardar este diseño en tu cuenta?')).toBeNull()
    // Empieza por el llamado "Mi primer diseño".
    expect(fetchSimulado.mock.calls[3][0].url).toMatch(/\/disenos\/d1$/)
    expect(localStorage.getItem(CLAVE_DISENO)).toBeNull()
    expect(localStorage.getItem(CLAVE_REGISTRO_ENVIADO)).toBeNull()
    expect(almacen.getState().documento).toBeNull()
  })

  it.each([
    ['la cuenta tiene otro contenido', [respuesta(200, [resumen('d1', 'Mi primer diseño')]), diseno('d1', 'Mi primer diseño', base)]],
    ['la cuenta no tiene diseños', [respuesta(200, [])]],
    ['no hay red', [new TypeError('Failed to fetch')]],
    ['el servidor falla', [respuesta(200, [resumen('d1', 'Mi primer diseño')]), respuesta(500, { mensaje: 'fallo' })]],
  ])('si se envió con el registro pero %s, pregunta y no descarta', async (_caso, despues) => {
    conAnonimo(conElemento)
    localStorage.setItem(CLAVE_REGISTRO_ENVIADO, serializarDocumento(conElemento))
    montar('')
    await entrarConExito(...despues)
    expect(await screen.findByText('¿Guardar este diseño en tu cuenta?')).toBeInTheDocument()
    expect(localStorage.getItem(CLAVE_DISENO)).not.toBeNull()
    expect(almacen.getState().documento).toEqual(conElemento)
  })

  it('si el navegador cierra la pregunta por su cuenta (Escape), vuelve a abrirse', async () => {
    conAnonimo(conElemento)
    montar('')
    await entrarConExito()
    const dialogo = (await screen.findByText('¿Guardar este diseño en tu cuenta?')).closest('dialog')!
    act(() => {
      dialogo.removeAttribute('open')
      fireEvent(dialogo, new Event('close'))
    })
    await vi.waitFor(() => expect(dialogo).toHaveAttribute('open'))
    expect(screen.getByRole('button', { name: 'No, descartarlo' })).toBeInTheDocument()
    expect(almacen.getState().documento).toEqual(conElemento)
  })

  it('un diseño anónimo vacío no hace preguntar', async () => {
    conAnonimo(base)
    montar('')
    await entrarConExito()
    expect(await screen.findByText('mis diseños')).toBeInTheDocument()
    expect(screen.queryByText('¿Guardar este diseño en tu cuenta?')).toBeNull()
  })
})
