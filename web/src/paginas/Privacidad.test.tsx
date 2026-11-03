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
