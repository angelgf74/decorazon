import { describe, expect, it } from 'vitest'
import css from './editor.css?raw'

describe('editor.css', () => {
  it('ocupa la altura visible en móvil (100dvh) con 100vh de respaldo', () => {
    expect(css).toMatch(/height:\s*100vh;\s*height:\s*100dvh;/)
  })
})

describe('editor.css: menores de las fases 8 y 9', () => {
  const regla = (selector: string) => css.slice(css.indexOf(`${selector} {`), css.indexOf('}', css.indexOf(`${selector} {`)) + 1)

  it('la marca ✓ y el borde de las muestras de color no dependen del esquema (las muestras son colores reales)', () => {
    expect(regla(".selector-color__muestra[aria-pressed='true']::after")).toMatch(/border: solid #2b2622;/)
    expect(css).toMatch(/\.selector-color__muestra \{[^}]*border: 1px solid var\(--gris\);/)
  })

  it('el chip de avisos abierto no cae en el hover genérico al pasar el ratón (texto claro sobre crema)', () => {
    expect(css).toMatch(/\.avisos__chip--mal\[aria-expanded='true'\],\s*\.avisos__chip--mal\[aria-expanded='true'\]:hover:not\(:disabled\) \{/)
  })
})
