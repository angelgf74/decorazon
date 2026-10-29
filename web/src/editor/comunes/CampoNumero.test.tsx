// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CampoNumero from './CampoNumero'

function montar(valor = 100) {
  const alCambiar = vi.fn()
  render(<CampoNumero etiqueta="Ancho" valor={valor} min={40} max={400} unidad="cm" alCambiar={alCambiar} />)
  return { alCambiar, campo: screen.getByLabelText('Ancho') as HTMLInputElement }
}

describe('CampoNumero', () => {
  it('confirma un número válido con Intro', async () => {
    const { alCambiar, campo } = montar()
    await userEvent.clear(campo)
    await userEvent.type(campo, '250{Enter}')
    expect(alCambiar).toHaveBeenCalledExactlyOnceWith(250)
  })

  it.each(['', '12,5', '1e3', 'abc'])('revierte con basura %j', async (texto) => {
    const { alCambiar, campo } = montar()
    await userEvent.clear(campo)
    if (texto) await userEvent.type(campo, texto)
    await userEvent.type(campo, '{Enter}')
    expect(alCambiar).not.toHaveBeenCalled()
    expect(campo.value).toBe('100')
  })

  it('recorta al mínimo y al máximo', async () => {
    const a = montar()
    await userEvent.clear(a.campo)
    await userEvent.type(a.campo, '-3{Enter}')
    expect(a.alCambiar).toHaveBeenCalledExactlyOnceWith(40)
  })

  it('recorta un número enorme al máximo', async () => {
    const { alCambiar, campo } = montar()
    await userEvent.clear(campo)
    await userEvent.type(campo, '99999{Enter}')
    expect(alCambiar).toHaveBeenCalledExactlyOnceWith(400)
  })

  it('Escape revierte sin llamar', async () => {
    const { alCambiar, campo } = montar()
    await userEvent.clear(campo)
    await userEvent.type(campo, '300{Escape}')
    expect(campo.value).toBe('100')
    await userEvent.tab()
    expect(alCambiar).not.toHaveBeenCalled()
  })

  it('no llama si el número no cambia', async () => {
    const { alCambiar, campo } = montar()
    await userEvent.clear(campo)
    await userEvent.type(campo, '100{Enter}')
    expect(alCambiar).not.toHaveBeenCalled()
  })

  it('confirma al perder el foco', async () => {
    const { alCambiar, campo } = montar()
    await userEvent.clear(campo)
    await userEvent.type(campo, '200')
    await userEvent.tab()
    expect(alCambiar).toHaveBeenCalledExactlyOnceWith(200)
  })

  it('sincroniza el texto cuando cambia la prop valor', () => {
    const alCambiar = vi.fn()
    const { rerender } = render(<CampoNumero etiqueta="Ancho" valor={100} min={40} max={400} alCambiar={alCambiar} />)
    rerender(<CampoNumero etiqueta="Ancho" valor={150} min={40} max={400} alCambiar={alCambiar} />)
    expect((screen.getByLabelText('Ancho') as HTMLInputElement).value).toBe('150')
  })

  it('muestra el rango como ayuda', () => {
    montar()
    expect(screen.getByText('40–400 cm')).toBeInTheDocument()
  })
})
