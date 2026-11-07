// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import Privacidad from './Privacidad'

describe('Privacidad', () => {
  it('explica a dónde va una sugerencia y que Decorazon no la guarda', () => {
    render(<Privacidad />, { wrapper: MemoryRouter })

    expect(screen.getByRole('heading', { level: 2, name: 'Sugerencias' })).toBeInTheDocument()
    expect(screen.getByText(/buzón de sugerencias/)).toHaveTextContent('Decorazon no la guarda')
  })
})

describe('Privacidad: lo que se mide', () => {
  it('dice que la medida de uso es anónima, sin cuenta ni diseño', () => {
    render(<Privacidad />, { wrapper: MemoryRouter })

    expect(screen.getByRole('heading', { level: 2, name: 'Qué medimos' })).toBeInTheDocument()
    expect(screen.getByText(/Medimos de forma anónima/)).toHaveTextContent('sin tu cuenta, sin tu diseño y sin nada que te identifique')
    // No va bajo «Sin cuenta»: se mide igual con cuenta.
    expect(screen.getByText(/vive solo en tu navegador/)).not.toHaveTextContent('Medimos')
  })
})
