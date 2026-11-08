import { describe, expect, it } from 'vitest'
import { formatoDeTamano } from './tamano'

describe('formatoDeTamano', () => {
  it('por debajo de 1 kB, en bytes', () => {
    expect(formatoDeTamano(0)).toBe('0 B')
    expect(formatoDeTamano(1023)).toBe('1023 B')
  })

  it('en kB con un decimal y coma, en base 1024 como el tope de 1 MB por diseño', () => {
    expect(formatoDeTamano(1024)).toBe('1,0 kB')
    expect(formatoDeTamano(1536)).toBe('1,5 kB')
  })

  it('desde 1 MB, en MB', () => {
    expect(formatoDeTamano(1024 * 1024)).toBe('1,0 MB')
    expect(formatoDeTamano(250 * 1024 * 1024)).toBe('250,0 MB')
  })

  it('desde 1 GB, en GB', () => {
    expect(formatoDeTamano(3 * 1024 ** 3)).toBe('3,0 GB')
  })
})
