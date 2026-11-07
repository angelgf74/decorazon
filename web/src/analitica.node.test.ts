import { describe, expect, it } from 'vitest'
import { evento } from './analitica'

// Sin window (tests del almacén, que corren en node): evento() no puede reventar.
describe('evento sin navegador', () => {
  it('no lanza', () => {
    expect(typeof window).toBe('undefined')
    expect(() => evento('vista-3d')).not.toThrow()
  })
})
