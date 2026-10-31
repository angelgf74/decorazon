// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DisenoServidor } from '../disenos/servidor'
import { almacen, reiniciarAlmacen } from '../editor/estado/almacen'
import { CLAVE_ID_DE_SUBIDA, CLAVE_REGISTRO_ENVIADO, claveCopia, guardarCopiaLocal, leerCopiaLocal } from '../editor/persistencia/local'
import { abrirDiseno, conectarSincronizacion, elegirApertura } from '../editor/persistencia/sincronizacion'
import { catalogoBase, documentoNuevo, elementoNuevo, serializarDocumento, type DocumentoDiseno } from '../nucleo'
import { respuesta } from '../pruebas/respuesta'
import { empezarDeNuevo, hayCambiosSinSubir, subirDisenoAnonimo, yaEstaEnLaCuenta } from './disenosLocales'

const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()
const doc: DocumentoDiseno = {
  ...documentoNuevo('salon', 400, 330, 250),
  elementos: [elementoNuevo(catalogoBase.get('armario')!, { x: 50, y: 50 }, 'e1')],
}
const alto = (n: number) => (d: DocumentoDiseno): DocumentoDiseno => ({ ...d, estancia: { ...d.estancia, alto: n } })

function disenoServidor(version: number, contenido: DocumentoDiseno): DisenoServidor {
  return {
    id: 'd9', nombre: 'Diseño sin título', tipoEstancia: 'salon', fechaDeCreacion: '2026-01-01T00:00:00Z',
    fechaDeModificacion: '2026-01-01T00:00:00Z', version, contenido,
  }
}

let desconectar: () => void = () => {}
const version = () => {
  const o = almacen.getState().origen
  return o.tipo === 'servidor' ? o.version : null
}

beforeEach(() => {
  localStorage.clear()
  reiniciarAlmacen()
  fetchSimulado.mockReset()
  vi.stubGlobal('fetch', fetchSimulado)
  desconectar = conectarSincronizacion(almacen, { esperaMs: 10, st: localStorage })
})
afterEach(() => {
  desconectar()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('subirDisenoAnonimo', () => {
  it('lo editado durante la subida no se pierde: se abre como pendiente y sale un PUT con ello', async () => {
    almacen.getState().cargar(doc)
    let responder: (r: Response) => void = () => {}
    fetchSimulado.mockImplementationOnce(() => new Promise<Response>((r) => { responder = r }))
    const subida = subirDisenoAnonimo(doc)
    await vi.waitFor(() => expect(fetchSimulado).toHaveBeenCalledOnce())
    almacen.getState().cambiar(alto(260))
    const editado = almacen.getState().documento
    responder(respuesta(201, disenoServidor(1, doc)))
    expect(await subida).toEqual({ id: 'd9' })
    expect(almacen.getState().documento).toBeNull()

    // Lo que hace EditorDeDiseno al abrir /disenos/d9.
    const copia = leerCopiaLocal(localStorage, 'd9')
    expect(copia).toMatchObject({ version: 1, pendiente: true })
    abrirDiseno(almacen, elegirApertura('d9', copia, { diseno: disenoServidor(1, doc), version: 1 })!)
    expect(almacen.getState().documento).toEqual(editado)
    expect(almacen.getState().guardado).toBe('pendiente')

    fetchSimulado.mockResolvedValueOnce(respuesta(200, disenoServidor(2, editado!)))
    await vi.waitFor(() => expect(almacen.getState().guardado).toBe('guardado'))
    const put = fetchSimulado.mock.calls[1]![0]
    expect(put.method).toBe('PUT')
    expect(put.headers.get('If-Match')).toBe('"1"')
    expect((await put.json()).contenido.estancia.alto).toBe(260)
  })

  it('sin cambios durante la subida no deja copia local', async () => {
    almacen.getState().cargar(doc)
    fetchSimulado.mockResolvedValueOnce(respuesta(201, disenoServidor(1, doc)))
    expect(await subirDisenoAnonimo(doc)).toEqual({ id: 'd9' })
    expect(leerCopiaLocal(localStorage, 'd9')).toBeNull()
  })

  const idDelCuerpo = async (n: number) => ((await fetchSimulado.mock.calls[n]![0].clone().json()) as { id?: string }).id

  it('si se pierde la respuesta del alta, el reintento manda el mismo id y no crea otro', async () => {
    almacen.getState().cargar(doc)
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect(await subirDisenoAnonimo(doc)).toMatchObject({ error: expect.any(String) })
    expect(almacen.getState().documento).not.toBeNull()

    fetchSimulado.mockResolvedValueOnce(respuesta(200, disenoServidor(1, doc)))
    expect(await subirDisenoAnonimo(doc)).toEqual({ id: 'd9' })
    const id = await idDelCuerpo(0)
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(await idDelCuerpo(1)).toBe(id)
  })

  it('un reintento que devuelve el contenido antiguo deja una copia pendiente con el actual', async () => {
    almacen.getState().cargar(doc)
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await subirDisenoAnonimo(doc)
    almacen.getState().cambiar(alto(260))
    const editado = almacen.getState().documento
    fetchSimulado.mockResolvedValueOnce(respuesta(200, disenoServidor(1, doc)))
    expect(await subirDisenoAnonimo(editado!)).toEqual({ id: 'd9' })
    expect(leerCopiaLocal(localStorage, 'd9')).toMatchObject({ version: 1, pendiente: true, documento: editado })
  })

  it('un reintento que devuelve un diseño editado en otro sitio deja la copia con la versión del alta y abre en conflicto', async () => {
    almacen.getState().cargar(doc)
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await subirDisenoAnonimo(doc)
    // El teléfono lo editó mientras tanto: el servidor va por la versión 3 con otro contenido.
    const delTelefono = alto(300)(doc)
    fetchSimulado.mockResolvedValueOnce(respuesta(200, disenoServidor(3, delTelefono)))
    expect(await subirDisenoAnonimo(doc)).toEqual({ id: 'd9' })

    const copia = leerCopiaLocal(localStorage, 'd9')
    expect(copia).toMatchObject({ version: 1, pendiente: true, documento: doc })
    const apertura = elegirApertura('d9', copia, { diseno: disenoServidor(3, delTelefono), version: 3 })
    expect(apertura).toMatchObject({ guardado: 'conflicto', versionRemota: 3 })
  })

  it('con la cuota llena, reintentar no duplica', async () => {
    almacen.getState().cargar(doc)
    let responder: (r: Response) => void = () => {}
    fetchSimulado.mockImplementationOnce(() => new Promise<Response>((r) => { responder = r }))
    const subida = subirDisenoAnonimo(doc)
    await vi.waitFor(() => expect(fetchSimulado).toHaveBeenCalledOnce())
    almacen.getState().cambiar(alto(260))
    const editado = almacen.getState().documento
    const setItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, clave: string, valor: string) {
      if (clave === claveCopia('d9')) throw new DOMException('cuota', 'QuotaExceededError')
      setItem.call(this, clave, valor)
    })
    responder(respuesta(201, disenoServidor(1, doc)))
    expect(await subida).toEqual({ id: 'd9' })
    expect(almacen.getState().documento).toEqual(editado)

    fetchSimulado.mockResolvedValueOnce(respuesta(200, disenoServidor(1, doc)))
    expect(await subirDisenoAnonimo(editado!)).toEqual({ id: 'd9' })
    expect(await idDelCuerpo(1)).toBe(await idDelCuerpo(0))
  })

  it('un diseño anónimo nuevo no reutiliza el id de subida del anterior', async () => {
    almacen.getState().cargar(doc)
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await subirDisenoAnonimo(doc)

    empezarDeNuevo()
    expect(almacen.getState().documento).toBeNull()
    const otro = alto(260)(doc)
    almacen.getState().cargar(otro)
    fetchSimulado.mockResolvedValueOnce(respuesta(201, disenoServidor(1, otro)))
    await subirDisenoAnonimo(otro)
    expect(await idDelCuerpo(1)).not.toBe(await idDelCuerpo(0))
  })

  it('tras subir, el id de subida se olvida', async () => {
    almacen.getState().cargar(doc)
    fetchSimulado.mockResolvedValueOnce(respuesta(201, disenoServidor(1, doc)))
    await subirDisenoAnonimo(doc)
    expect(localStorage.getItem(CLAVE_ID_DE_SUBIDA)).toBeNull()
  })

  it('con un 409 el id de subida se olvida y el siguiente intento usa otro', async () => {
    almacen.getState().cargar(doc)
    fetchSimulado.mockResolvedValueOnce(respuesta(409, { mensaje: 'Id ocupado' }))
    expect(await subirDisenoAnonimo(doc)).toMatchObject({ error: expect.any(String) })
    expect(localStorage.getItem(CLAVE_ID_DE_SUBIDA)).toBeNull()

    fetchSimulado.mockResolvedValueOnce(respuesta(201, disenoServidor(1, doc)))
    await subirDisenoAnonimo(doc)
    expect(await idDelCuerpo(1)).not.toBe(await idDelCuerpo(0))
  })
})

describe('yaEstaEnLaCuenta', () => {
  const otro = alto(260)(doc)
  const resumen = (id: string) => ({ id, nombre: 'Salón', tipoEstancia: 'salon', fechaDeCreacion: '', fechaDeModificacion: '', version: 1 })

  /** 10 candidatos; responde a cada GET tras un momento, contando cuántos van a la vez. */
  function conCandidatos(contenidoDe: (id: string) => DocumentoDiseno | 'falla') {
    localStorage.setItem(CLAVE_REGISTRO_ENVIADO, serializarDocumento(doc))
    const ids = Array.from({ length: 10 }, (_, i) => `c${i}`)
    const visto = { enVuelo: 0, maximo: 0, pedidos: [] as string[] }
    fetchSimulado.mockImplementation(async (p) => {
      const ruta = new URL(p.url).pathname
      if (ruta.endsWith('/disenos')) return respuesta(200, ids.map(resumen))
      const id = ruta.split('/').at(-1)!
      visto.pedidos.push(id)
      visto.enVuelo++
      visto.maximo = Math.max(visto.maximo, visto.enVuelo)
      await new Promise((r) => setTimeout(r, 5))
      visto.enVuelo--
      const c = contenidoDe(id)
      return c === 'falla' ? respuesta(500, { mensaje: 'fallo' }) : respuesta(200, { ...disenoServidor(1, c), id })
    })
    return visto
  }

  it('pide los candidatos en paralelo, como mucho 4 a la vez, y para en cuanto uno coincide', async () => {
    const visto = conCandidatos((id) => (id === 'c1' ? doc : otro))
    expect(await yaEstaEnLaCuenta(doc)).toBe(true)
    expect(visto.maximo).toBe(4)
    expect(visto.pedidos.length).toBeLessThan(10)
    expect(localStorage.getItem(CLAVE_REGISTRO_ENVIADO)).toBeNull()
  })

  it('sin coincidencia y con algún error, responde que no y no borra la marca', async () => {
    const visto = conCandidatos((id) => (id === 'c2' ? 'falla' : otro))
    expect(await yaEstaEnLaCuenta(doc)).toBe(false)
    expect(visto.maximo).toBeLessThanOrEqual(4)
    expect(localStorage.getItem(CLAVE_REGISTRO_ENVIADO)).not.toBeNull()
  })
})

describe('hayCambiosSinSubir', () => {
  it('sin copias ni diseño del servidor abierto, no', () => {
    almacen.getState().cargar(doc)
    almacen.getState().marcarGuardado('error')
    expect(hayCambiosSinSubir()).toBe(false)
  })

  it('una copia local pendiente, sí; una al día, no', () => {
    guardarCopiaLocal(localStorage, 'a', { version: 1, documento: doc, pendiente: false })
    expect(hayCambiosSinSubir()).toBe(false)
    guardarCopiaLocal(localStorage, 'b', { version: 1, documento: doc, pendiente: true })
    expect(hayCambiosSinSubir()).toBe(true)
  })

  it.each(['pendiente', 'sinConexion', 'conflicto', 'error'] as const)('un diseño del servidor abierto en "%s", sí', (g) => {
    almacen.getState().abrirDelServidor('d1', 1, 'Cocina', doc)
    expect(hayCambiosSinSubir()).toBe(false)
    almacen.getState().marcarGuardado(g)
    expect(hayCambiosSinSubir()).toBe(true)
  })

  it('un guardado en marcha, sí', async () => {
    almacen.getState().abrirDelServidor('d1', 1, 'Cocina', doc)
    let responder: (r: Response) => void = () => {}
    fetchSimulado.mockImplementationOnce(() => new Promise<Response>((r) => { responder = r }))
    almacen.getState().cambiar(alto(260))
    await vi.waitFor(() => expect(fetchSimulado).toHaveBeenCalledOnce())
    // Sin mirar el indicador ni la copia: solo el guardado en marcha.
    almacen.getState().marcarGuardado('guardado')
    localStorage.clear()
    expect(hayCambiosSinSubir()).toBe(true)
    responder(respuesta(200, { ...disenoServidor(2, alto(260)(doc)), id: 'd1' }))
    await vi.waitFor(() => expect(version()).toBe(2))
    localStorage.clear()
    expect(hayCambiosSinSubir()).toBe(false)
  })
})
