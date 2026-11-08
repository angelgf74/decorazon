// @vitest-environment jsdom
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Disparar, FOTOGRAMAS } from './Captura3D'

const sonda = { dpr: 0 }
function Sonda() {
  const dpr = useThree((e) => e.viewport.dpr)
  useEffect(() => {
    sonda.dpr = dpr
  }, [dpr])
  return null
}

afterEach(() => vi.restoreAllMocks())

describe('Disparar', () => {
  it('sube el dpr dos fotogramas antes de capturar y captura una sola vez', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AAAA')
    const alCapturar = vi.fn()
    const r = await ReactThreeTestRenderer.create(<><Disparar alCapturar={alCapturar} dpr={2} /><Sonda /></>)
    await r.advanceFrames(FOTOGRAMAS - 3, 16)
    expect(alCapturar).not.toHaveBeenCalled()
    expect(sonda.dpr).toBe(1)
    await r.advanceFrames(1, 16)
    expect(sonda.dpr).toBe(2)
    expect(alCapturar).not.toHaveBeenCalled()
    await r.advanceFrames(2, 16)
    expect(alCapturar).toHaveBeenCalledExactlyOnceWith('data:image/png;base64,AAAA')
    await r.advanceFrames(5, 16)
    expect(alCapturar).toHaveBeenCalledOnce()
  })

  it('con dpr 1 no toca el dpr', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:,')
    const r = await ReactThreeTestRenderer.create(<><Disparar alCapturar={() => {}} dpr={1} /><Sonda /></>)
    await r.advanceFrames(FOTOGRAMAS, 16)
    expect(sonda.dpr).toBe(1)
  })
})
