import { describe, expect, it } from 'vitest'
import type { DefinicionVariante } from '../../nucleo'
import { etiquetaValor } from './variantes'

const base: DefinicionVariante = {
  clave: 'base', etiqueta: 'Base', valores: ['patas', 'canape', 'nido'], defecto: 'patas',
  etiquetas: { canape: 'Canapé', nido: 'Cama nido' },
}

describe('etiquetaValor', () => {
  it('sin etiquetas: Sí/No, la cifra o el texto con mayúscula', () => {
    expect(etiquetaValor(true)).toBe('Sí')
    expect(etiquetaValor(false)).toBe('No')
    expect(etiquetaValor(3)).toBe('3')
    expect(etiquetaValor('correderas')).toBe('Correderas')
  })

  it('con la variante, usa su etiqueta si la hay (tildes, varias palabras) y si no, el texto con mayúscula', () => {
    expect(etiquetaValor('canape', base)).toBe('Canapé')
    expect(etiquetaValor('nido', base)).toBe('Cama nido')
    expect(etiquetaValor('patas', base)).toBe('Patas')
  })
})
