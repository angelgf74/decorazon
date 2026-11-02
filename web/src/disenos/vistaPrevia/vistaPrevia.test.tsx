// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { almacen, reiniciarAlmacen } from '../../editor/estado/almacen'
import { documentoNuevo } from '../../nucleo'
import { respuesta } from '../../pruebas/respuesta'
import { apuntarVistaPrevia, ESPERA_ENTRE_VISTAS_MS, tocaRehacer } from './frecuencia'
import RefrescoDeVistaPrevia from './RefrescoDeVistaPrevia'

// Sin WebGL en jsdom: el generador se sustituye por uno que entrega una imagen al momento.
vi.mock('./GeneradorDeVistaPrevia', () => ({
  default: ({ alTerminar }: { alTerminar(b: Blob | null): void }) => {
    queueMicrotask(() => alTerminar(new Blob(['jpeg'], { type: 'image/jpeg' })))
    return null
  },
}))

const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()
const subidas = () => fetchSimulado.mock.calls.filter(([p]) => p.method === 'PUT' && new URL(p.url).pathname === '/disenos/d1/vista-previa')

/** Simula un guardado: la versión del diseño abierto sube. */
function guardado(version: number) {
  act(() => almacen.setState((e) => ({ origen: { ...e.origen, version } as typeof e.origen })))
}

beforeEach(() => {
  localStorage.clear()
  fetchSimulado.mockReset()
  fetchSimulado.mockResolvedValue(respuesta(204))
  vi.stubGlobal('fetch', fetchSimulado)
  reiniciarAlmacen()
  almacen.getState().abrirDelServidor('d1', 1, 'Cocina', documentoNuevo('cocina', 400, 300, 250))
})
afterEach(() => vi.unstubAllGlobals())

describe('frecuencia de la vista previa', () => {
  it('toca rehacerla si nunca se hizo o hace más de 5 minutos', () => {
    expect(tocaRehacer('d1', 1_000_000)).toBe(true)
    apuntarVistaPrevia('d1', 1_000_000)
    expect(tocaRehacer('d1', 1_000_000 + ESPERA_ENTRE_VISTAS_MS - 1)).toBe(false)
    expect(tocaRehacer('d1', 1_000_000 + ESPERA_ENTRE_VISTAS_MS)).toBe(true)
    expect(tocaRehacer('otro', 1_000_000)).toBe(true)
  })
})

describe('RefrescoDeVistaPrevia', () => {
  it('al guardar un diseño compartido rehace y sube la imagen, pero no otra vez en 5 minutos', async () => {
    render(<RefrescoDeVistaPrevia id="d1" compartido />)
    // Abrirlo no cuenta como guardar.
    expect(subidas()).toHaveLength(0)
    guardado(2)
    await vi.waitFor(() => expect(subidas()).toHaveLength(1))
    expect(subidas()[0]![0].headers.get('Content-Type')).toBe('image/jpeg')
    guardado(3)
    await new Promise((r) => setTimeout(r, 20))
    expect(subidas()).toHaveLength(1)
  })

  it('un diseño que no se comparte no rehace nada al guardar', async () => {
    render(<RefrescoDeVistaPrevia id="d1" compartido={false} />)
    guardado(2)
    await new Promise((r) => setTimeout(r, 20))
    expect(subidas()).toHaveLength(0)
  })
})
