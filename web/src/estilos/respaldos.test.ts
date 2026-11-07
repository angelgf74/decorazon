import { describe, expect, it } from 'vitest'
import base from './base.css?raw'
import vista3d from '../editor/vista3d/vista3d.css?raw'

describe('respaldos y contrastes de las hojas (menores de la fase 9)', () => {
  it('cada color-mix() de base.css lleva antes un color fijo: Safari < 16.2 descarta la declaración entera', () => {
    for (const m of base.matchAll(/([a-z-]+): color-mix\(/g)) {
      const antes = base.slice(Math.max(0, m.index! - 120), m.index)
      expect(antes.trimEnd().endsWith(';') && new RegExp(`${m[1]}: #[0-9a-fA-F]{6};$`).test(antes.trimEnd()), m[0]).toBe(true)
    }
  })

  it('«Preparando la vista 3D» va con un gris fijo: el fondo de la 3D es claro también de noche', () => {
    expect(vista3d).toMatch(/background: #f4efe8; color: #6f6862;/)
  })
})
