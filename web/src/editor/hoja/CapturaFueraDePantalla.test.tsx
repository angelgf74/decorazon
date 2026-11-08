// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { documentoNuevo } from '../../nucleo'
import CapturaFueraDePantalla from './CapturaFueraDePantalla'

const webgl = vi.hoisted(() => ({ hay: false }))
const carga = vi.hoisted(() => ({ veces: 0, dpr: 0 }))
vi.mock('../comunes/webgl', () => ({ hayWebgl: () => webgl.hay }))
// El fragmento con three: se cuenta cuántas veces se pide y con qué dpr se monta.
vi.mock('../vista3d/Captura3D', () => {
  carga.veces += 1
  return { default: ({ dpr }: { dpr?: number }) => { carga.dpr = dpr ?? 1; return <p>captura 3d</p> } }
})

afterEach(() => {
  vi.useRealTimers()
  webgl.hay = false
})

describe('CapturaFueraDePantalla', () => {
  it('sin WebGL avisa del fallo una sola vez y no pide el fragmento con three', async () => {
    const alFallar = vi.fn()
    const alCapturar = vi.fn()
    const antes = carga.veces
    render(<CapturaFueraDePantalla doc={documentoNuevo('salon', 400, 330, 250)} alCapturar={alCapturar} alFallar={alFallar} />)
    await act(async () => {})
    expect(alFallar).toHaveBeenCalledOnce()
    expect(alCapturar).not.toHaveBeenCalled()
    expect(carga.veces).toBe(antes)
  })

  it('con WebGL monta la captura a dpr 2 (2400 × 1600, para imprimir) y, si no llega en 8 s, avisa del fallo una sola vez', async () => {
    // Solo los temporizadores: la carga perezosa del marcador va por microtareas.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    webgl.hay = true
    const alFallar = vi.fn()
    const { getByText } = render(<CapturaFueraDePantalla doc={documentoNuevo('salon', 400, 330, 250)} alCapturar={() => {}} alFallar={alFallar} />)
    await act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve() })
    expect(getByText('captura 3d')).toBeInTheDocument()
    expect(carga.dpr).toBe(2)
    expect(alFallar).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(8000) })
    expect(alFallar).toHaveBeenCalledOnce()
  })
})
