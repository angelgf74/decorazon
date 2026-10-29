// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { almacen, reiniciarAlmacen } from './estado/almacen'
import { useAtajos } from './usarAtajos'

function Sonda() {
  useAtajos()
  return <input aria-label="campo" />
}

beforeEach(() => {
  reiniciarAlmacen()
  almacen.getState().crear('salon', 400, 330, 250)
  almacen.getState().cambiar((d) => ({ ...d, estancia: { ...d.estancia, alto: 260 } }))
})

describe('usarAtajos', () => {
  it('Ctrl+Z deshace y Ctrl+Y rehace', () => {
    render(<Sonda />)
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(almacen.getState().documento?.estancia.alto).toBe(250)
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true })
    expect(almacen.getState().documento?.estancia.alto).toBe(260)
  })

  it('Ctrl+Shift+Z rehace y Cmd+Z deshace', () => {
    render(<Sonda />)
    fireEvent.keyDown(window, { key: 'z', metaKey: true })
    expect(almacen.getState().documento?.estancia.alto).toBe(250)
    fireEvent.keyDown(window, { key: 'Z', ctrlKey: true, shiftKey: true })
    expect(almacen.getState().documento?.estancia.alto).toBe(260)
  })

  it('con el foco en un input no deshace', () => {
    render(<Sonda />)
    fireEvent.keyDown(screen.getByLabelText('campo'), { key: 'z', ctrlKey: true })
    expect(almacen.getState().documento?.estancia.alto).toBe(260)
  })

  it('con un diálogo abierto no actúa', () => {
    almacen.getState().seleccionar({ tipo: 'pared', indice: 0 })
    render(<Sonda />)
    const d = document.createElement('dialog')
    d.setAttribute('open', '')
    document.body.appendChild(d)
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'Escape' })
    d.remove()
    expect(almacen.getState().documento?.estancia.alto).toBe(260)
    expect(almacen.getState().seleccion).not.toBeNull()
  })

  it('Escape anula la selección', () => {
    almacen.getState().seleccionar({ tipo: 'pared', indice: 0 })
    render(<Sonda />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(almacen.getState().seleccion).toBeNull()
  })
})
