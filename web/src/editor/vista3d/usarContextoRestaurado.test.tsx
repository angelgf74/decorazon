// @vitest-environment jsdom
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { useThree } from '@react-three/fiber'
import { useLayoutEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useContextoRestaurado } from './usarContextoRestaurado'

const sonda = { lienzo: undefined as unknown as HTMLCanvasElement }

function Prueba({ invalidar }: { invalidar: () => void }) {
  const set = useThree((e) => e.set)
  const gl = useThree((e) => e.gl)
  useLayoutEffect(() => {
    set({ invalidate: invalidar })
    sonda.lienzo = gl.domElement
  }, [set, gl, invalidar])
  useContextoRestaurado()
  return null
}

describe('useContextoRestaurado', () => {
  it('al recuperar el contexto WebGL pide repintar (con frameloop demand, si no, se queda negro)', async () => {
    const invalidar = vi.fn()
    const r = await ReactThreeTestRenderer.create(<Prueba invalidar={invalidar} />)
    invalidar.mockClear()
    sonda.lienzo.dispatchEvent(new Event('webglcontextrestored'))
    expect(invalidar).toHaveBeenCalledTimes(1)
    await r.unmount()
    sonda.lienzo.dispatchEvent(new Event('webglcontextrestored'))
    expect(invalidar).toHaveBeenCalledTimes(1)
  })
})
