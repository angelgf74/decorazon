// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { documentoNuevo } from '../../nucleo'
import CapturaFueraDePantalla from './CapturaFueraDePantalla'

const webgl = vi.hoisted(() => ({ hay: false }))
const carga = vi.hoisted(() => ({ veces: 0, dpr: 0, alPrimerFotograma: undefined as (() => void) | undefined }))
vi.mock('../comunes/webgl', () => ({ hayWebgl: () => webgl.hay }))
// El fragmento con three: se cuenta cuántas veces se pide, con qué dpr se monta y se guarda su aviso del primer fotograma.
vi.mock('../vista3d/Captura3D', () => {
  carga.veces += 1
  return {
    default: ({ dpr, alPrimerFotograma }: { dpr?: number; alPrimerFotograma?: () => void }) => {
      carga.dpr = dpr ?? 1
      carga.alPrimerFotograma = alPrimerFotograma
      return <p>captura 3d</p>
    },
  }
})

afterEach(() => {
  vi.useRealTimers()
  webgl.hay = false
  carga.alPrimerFotograma = undefined
})

async function montarConWebgl() {
  // Solo los temporizadores: la carga perezosa del marcador va por microtareas.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  webgl.hay = true
  const alFallar = vi.fn()
  const r = render(<CapturaFueraDePantalla doc={documentoNuevo('salon', 400, 330, 250)} alCapturar={() => {}} alFallar={alFallar} />)
  await act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve() })
  return { ...r, alFallar }
}

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

  it('con WebGL monta la captura a dpr 2 (2400 × 1600, para imprimir)', async () => {
    const { getByText } = await montarConWebgl()
    expect(getByText('captura 3d')).toBeInTheDocument()
    expect(carga.dpr).toBe(2)
  })

  it('un arranque lento (sin primer fotograma) tiene 20 s, no 8: luego avisa del fallo una sola vez', async () => {
    const { alFallar } = await montarConWebgl()
    await act(async () => { await vi.advanceTimersByTimeAsync(19_999) })
    expect(alFallar).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(alFallar).toHaveBeenCalledOnce()
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(alFallar).toHaveBeenCalledOnce()
  })

  it('desde el primer fotograma quedan 8 s para capturar, aunque el arranque haya gastado casi 20', async () => {
    const { alFallar } = await montarConWebgl()
    await act(async () => { await vi.advanceTimersByTimeAsync(19_000) })
    act(() => carga.alPrimerFotograma?.())
    await act(async () => { await vi.advanceTimersByTimeAsync(7_999) })
    expect(alFallar).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(alFallar).toHaveBeenCalledOnce()
  })
})
