import { describe, expect, it } from 'vitest'
import css from './editor.css?raw'

describe('editor.css', () => {
  it('ocupa la altura visible en móvil (100dvh) con 100vh de respaldo', () => {
    expect(css).toMatch(/height:\s*100vh;\s*height:\s*100dvh;/)
  })
})
