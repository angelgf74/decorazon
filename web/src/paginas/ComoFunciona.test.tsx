// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { textos } from '../textos'
import ComoFunciona from './ComoFunciona'

const t = textos.comoFunciona
const montar = () => render(<ComoFunciona />, { wrapper: MemoryRouter })

describe('Cómo funciona', () => {
  it('un solo h1 y un h2 por paso, en orden', () => {
    montar()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const pasos = screen.getByRole('list', { name: t.pasosTitulo })
    const titulos = within(pasos).getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(titulos).toEqual(t.pasos.map((p) => p.titulo))
    expect(titulos.length).toBeGreaterThanOrEqual(5)
  })

  it('cada paso lleva una imagen con texto alternativo y medidas fijas (sin saltos al cargar)', () => {
    montar()
    for (const paso of t.pasos) {
      const img = screen.getByRole('img', { name: paso.imagenAlt })
      expect(img).toHaveAttribute('src', expect.stringMatching(/^\/capturas\/[a-z0-9-]+[.]webp$/))
      expect(img).toHaveAttribute('width')
      expect(img).toHaveAttribute('height')
      expect(img).toHaveAttribute('loading', 'lazy')
    }
  })

  it('las preguntas frecuentes tienen respuesta y se puede empezar a diseñar desde arriba y desde abajo', () => {
    montar()
    for (const p of t.preguntas) expect(screen.getByRole('heading', { level: 3, name: p.pregunta })).toBeInTheDocument()
    const empezar = screen.getAllByRole('link', { name: t.empezar })
    expect(empezar).toHaveLength(2)
    for (const a of empezar) expect(a).toHaveAttribute('href', '/disenar')
  })
})
