// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { almacen, reiniciarAlmacen } from '../../editor/estado/almacen'
import { documentoNuevo } from '../../nucleo'
import { respuesta } from '../../pruebas/respuesta'
import { apuntarVistaPrevia, ESPERA_ENTRE_VISTAS_MS, olvidarVistasPreviasEnMemoria, tocaRehacer } from './frecuencia'
import RefrescoDeVistaPrevia from './RefrescoDeVistaPrevia'

// Sin WebGL en jsdom: el generador se sustituye por uno que entrega, al momento, una imagen con el alto del documento.
vi.mock('./GeneradorDeVistaPrevia', () => ({
  default: ({ doc, alTerminar }: { doc: { estancia: { alto: number } }; alTerminar(b: Blob | null): void }) => {
    queueMicrotask(() => alTerminar(new Blob([`alto=${doc.estancia.alto}`], { type: 'image/jpeg' })))
    return null
  },
}))

const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()
const subidas = () => fetchSimulado.mock.calls.filter(([p]) => p.method === 'PUT' && new URL(p.url).pathname === '/disenos/d1/vista-previa')
const tick = (ms = 20) => act(() => new Promise((r) => setTimeout(r, ms)))

/** Simula un guardado: la versión del diseño abierto sube, con el documento que se guardó. */
function guardado(version: number, alto = 250) {
  act(() => almacen.setState((e) => ({
    origen: { ...e.origen, version } as typeof e.origen,
    documento: { ...e.documento!, estancia: { ...e.documento!.estancia, alto } },
  })))
}

beforeEach(() => {
  localStorage.clear()
  olvidarVistasPreviasEnMemoria()
  fetchSimulado.mockReset()
  fetchSimulado.mockResolvedValue(respuesta(204))
  vi.stubGlobal('fetch', fetchSimulado)
  reiniciarAlmacen()
  almacen.getState().abrirDelServidor('d1', 1, 'Cocina', documentoNuevo('cocina', 400, 300, 250))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('frecuencia de la vista previa', () => {
  it('toca rehacerla si nunca se hizo o hace más de 5 minutos', () => {
    expect(tocaRehacer('d1', 1_000_000)).toBe(true)
    apuntarVistaPrevia('d1', 1_000_000)
    expect(tocaRehacer('d1', 1_000_000 + ESPERA_ENTRE_VISTAS_MS - 1)).toBe(false)
    expect(tocaRehacer('d1', 1_000_000 + ESPERA_ENTRE_VISTAS_MS)).toBe(true)
    expect(tocaRehacer('otro', 1_000_000)).toBe(true)
  })

  it('sin almacenamiento, recuerda en memoria: no rehace en 5 minutos', () => {
    vi.stubGlobal('localStorage', undefined)
    apuntarVistaPrevia('sin', 2_000_000)
    expect(tocaRehacer('sin', 2_000_000 + 1000)).toBe(false)
  })
})

describe('RefrescoDeVistaPrevia', () => {
  it('abrirlo no cuenta como guardar; el primer guardado rehace y sube la imagen', async () => {
    render(<RefrescoDeVistaPrevia id="d1" />)
    await tick()
    expect(subidas()).toHaveLength(0)
    guardado(2)
    await vi.waitFor(() => expect(subidas()).toHaveLength(1))
    expect(subidas()[0]![0].headers.get('Content-Type')).toBe('image/jpeg')
  })

  it('los guardados dentro de los 5 minutos se juntan en una imagen con lo último, al vencer la espera', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<RefrescoDeVistaPrevia id="d1" />)
    guardado(2, 250)
    await vi.waitFor(() => expect(subidas()).toHaveLength(1))
    guardado(3, 260)
    guardado(4, 270)
    await tick()
    expect(subidas()).toHaveLength(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(ESPERA_ENTRE_VISTAS_MS) })
    await vi.waitFor(() => expect(subidas()).toHaveLength(2))
    expect(await subidas()[1]![0].text()).toBe('alto=270')
  })

  it('sin almacenamiento no entra en bucle: una imagen por guardado y espera', async () => {
    vi.stubGlobal('localStorage', undefined)
    render(<RefrescoDeVistaPrevia id="d1" />)
    guardado(2)
    await vi.waitFor(() => expect(subidas()).toHaveLength(1))
    await tick(50)
    expect(subidas()).toHaveLength(1)
  })

  it('un diseño que no se comparte también rehace y sube la imagen al guardar (es la miniatura de Mis diseños), sin preguntar nada', async () => {
    render(<RefrescoDeVistaPrevia id="d1" />)
    guardado(2)
    await vi.waitFor(() => expect(subidas()).toHaveLength(1))
    expect(fetchSimulado.mock.calls.filter(([p]) => p.method === 'GET')).toHaveLength(0)
  })

  it('si la subida falla no se enseña nada y el siguiente guardado tras la espera lo vuelve a intentar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    fetchSimulado.mockResolvedValue(respuesta(500, { mensaje: 'falla' }))
    render(<RefrescoDeVistaPrevia id="d1" />)
    guardado(2)
    await vi.waitFor(() => expect(subidas()).toHaveLength(1))
    guardado(3)
    await act(async () => { await vi.advanceTimersByTimeAsync(ESPERA_ENTRE_VISTAS_MS) })
    await vi.waitFor(() => expect(subidas()).toHaveLength(2))
  })
})
