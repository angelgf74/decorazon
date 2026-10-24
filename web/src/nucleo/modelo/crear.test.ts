import { describe, expect, it } from 'vitest'
import { documentoNuevo } from './crear'
import { validarDocumento } from './validar'

describe('documentoNuevo', () => {
  it('crea una planta rectangular y es válido', () => {
    const d = documentoNuevo('dormitorio', 400, 330, 250)
    expect(d.estancia.planta).toEqual([
      { x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 330 }, { x: 0, y: 330 },
    ])
    expect(d.estancia.alto).toBe(250)
    expect(d.estancia.grosorPared).toBe(10)
    expect(validarDocumento(d).valido).toBe(true)
  })
})
