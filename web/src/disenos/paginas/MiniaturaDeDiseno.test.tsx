// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MiniaturaDeDiseno from './MiniaturaDeDiseno'
import { olvidarMiniaturas } from './miniaturas'

const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()
const jpeg = () => new Response('jpeg', { status: 200, headers: { 'Content-Type': 'image/jpeg' } })

beforeEach(() => {
  olvidarMiniaturas()
  fetchSimulado.mockReset()
  vi.stubGlobal('fetch', fetchSimulado)
  // jsdom no tiene object URLs.
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:miniatura'), revokeObjectURL: vi.fn() }))
})
afterEach(() => vi.unstubAllGlobals())

describe('MiniaturaDeDiseno', () => {
  it('con fecha pide la imagen del dueño y la pinta; la misma id y fecha se pide una sola vez', async () => {
    fetchSimulado.mockImplementation(async () => jpeg())
    const primera = render(<MiniaturaDeDiseno id="d1" fecha="2026-11-07T10:00:00Z" />)
    // La miniatura es decorativa (aria-hidden): se busca en el DOM, no por rol.
    await vi.waitFor(() => expect(primera.container.querySelector('img')).toHaveAttribute('src', 'blob:miniatura'))
    expect(new URL(fetchSimulado.mock.calls[0]![0].url).pathname).toBe('/disenos/d1/vista-previa')
    primera.unmount()
    const segunda = render(<MiniaturaDeDiseno id="d1" fecha="2026-11-07T10:00:00Z" />)
    await vi.waitFor(() => expect(segunda.container.querySelector('img')).not.toBeNull())
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })

  it('sin fecha, el hueco y ninguna petición', () => {
    const { container } = render(<MiniaturaDeDiseno id="d1" fecha={null} />)
    expect(container.querySelector('.disenos__miniatura')).not.toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(fetchSimulado).not.toHaveBeenCalled()
  })

  it('si la petición falla, el hueco; y el fallo no se recuerda: la siguiente vez se vuelve a pedir', async () => {
    fetchSimulado.mockResolvedValueOnce(new Response(JSON.stringify({ mensaje: 'no' }), { status: 429, headers: { 'Content-Type': 'application/json' } }))
    const primera = render(<MiniaturaDeDiseno id="d1" fecha="2026-11-07T10:00:00Z" />)
    await vi.waitFor(() => expect(fetchSimulado).toHaveBeenCalledTimes(1))
    await new Promise((r) => setTimeout(r, 10))
    expect(primera.container.querySelector('img')).toBeNull()
    expect(primera.container.querySelector('.disenos__miniatura')).not.toBeNull()
    primera.unmount()
    fetchSimulado.mockImplementation(async () => jpeg())
    const segunda = render(<MiniaturaDeDiseno id="d1" fecha="2026-11-07T10:00:00Z" />)
    await vi.waitFor(() => expect(segunda.container.querySelector('img')).not.toBeNull())
    expect(fetchSimulado).toHaveBeenCalledTimes(2)
  })
})
