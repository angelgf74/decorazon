import { describe, expect, it } from 'vitest'
import { catalogoBase, type DefinicionTipo } from '../nucleo'
import { firmaDelModelo } from './firma'

const tipo = (id: string): DefinicionTipo => {
  const def = catalogoBase.get(id)
  if (!def) throw new Error(`No existe el tipo ${id}`)
  return def
}

describe('firmaDelModelo', () => {
  it('da la misma firma al mismo tipo, aunque elementoNuevo use otro id cada vez', () => {
    expect(firmaDelModelo(tipo('armario'))).toBe(firmaDelModelo(tipo('armario')))
  })

  it('son 8 cifras hexadecimales', () => {
    expect(firmaDelModelo(tipo('armario'))).toMatch(/^[0-9a-f]{8}$/)
  })

  it('distingue dos tipos distintos', () => {
    expect(firmaDelModelo(tipo('armario'))).not.toBe(firmaDelModelo(tipo('comoda')))
  })

  it('cambia si una pieza del modelo se mueve 1 mm', () => {
    const armario = tipo('armario')
    const modelo = armario.modelo3d!
    let movidas = 0
    const movido: DefinicionTipo = {
      ...armario,
      modelo3d: (e) => {
        movidas = 0
        return modelo(e).map((p) => (p.forma === 'caja' && movidas++ === 0 ? { ...p, x0: p.x0 + 0.1, x1: p.x1 + 0.1 } : p))
      },
    }
    expect(firmaDelModelo(movido)).not.toBe(firmaDelModelo(armario))
    expect(movidas).toBeGreaterThan(0)
  })

  it('cambia si cambia el color por defecto de su primera zona', () => {
    const armario = tipo('armario')
    const [primera, ...resto] = armario.zonasColor
    const otroColor: DefinicionTipo = { ...armario, zonasColor: [{ ...primera!, defecto: '#123456' }, ...resto] }
    expect(firmaDelModelo(otroColor)).not.toBe(firmaDelModelo(armario))
  })
})
