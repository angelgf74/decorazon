// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DisenoServidor } from '../disenos/servidor'
import { almacen, reiniciarAlmacen } from '../editor/estado/almacen'
import { guardarCopiaLocal, leerCopiaLocal } from '../editor/persistencia/local'
import { abrirDiseno, conectarSincronizacion, elegirApertura } from '../editor/persistencia/sincronizacion'
import { catalogoBase, documentoNuevo, elementoNuevo, type DocumentoDiseno } from '../nucleo'
import { respuesta } from '../pruebas/respuesta'
import { hayCambiosSinSubir, subirDisenoAnonimo } from './disenosLocales'

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
