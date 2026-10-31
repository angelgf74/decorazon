// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Icono from './Icono'
import { NOMBRES_ICONO } from './iconos'

describe('Icono', () => {
  it.each(NOMBRES_ICONO)('"%s" es un svg decorativo con trazado', (nombre) => {
    const { container } = render(<Icono nombre={nombre} />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.getAttribute('aria-hidden')).toBe('true')
    expect(svg!.getAttribute('focusable')).toBe('false')
    expect(svg!.children.length).toBeGreaterThan(0)
  })
})
