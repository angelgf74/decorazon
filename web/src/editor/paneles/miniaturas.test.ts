import { describe, expect, it } from 'vitest'
import { catalogoBase } from '../../nucleo'
import { firmaDelModelo } from '../../miniaturas/firma'
import { MINIATURAS } from './miniaturas.generado'

// Los ficheros de public/miniaturas y su peso los vigila pruebas-build/miniaturas.test.ts (aquí no hay tipos de Node).
const REGENERAR = 'regenera con npm run miniaturas'

describe('miniaturas 3D del catálogo', () => {
  it('cada tipo tiene su miniatura al día con su modelo', () => {
    for (const def of catalogoBase.values()) {
      const m = MINIATURAS[def.id]
      expect(m, `${def.id} no tiene miniatura: ${REGENERAR}`).toBeDefined()
      expect(m!.firma, `la miniatura de ${def.id} es de otro modelo: ${REGENERAR}`).toBe(firmaDelModelo(def))
    }
  })

  it('no quedan miniaturas de tipos que ya no existen', () => {
    expect(Object.keys(MINIATURAS).filter((id) => !catalogoBase.has(id))).toEqual([])
  })
})
