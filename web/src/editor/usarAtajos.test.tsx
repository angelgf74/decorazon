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
  it('Supr quita la abertura seleccionada y Retroceso la columna', () => {
    almacen.getState().cambiar((d) => ({
      ...d,
      aberturas: [{ id: 'v', tipo: 'ventana', pared: 0, posicion: 50, ancho: 100, alto: 120, alturaSuelo: 90, abreHaciaDentro: false }],
      estructura: [{ id: 'c', tipo: 'columna', centro: { x: 200, y: 165 }, ancho: 30, fondo: 30, rotacion: 0 }],
    }))
    render(<Sonda />)
    almacen.getState().seleccionar({ tipo: 'abertura', id: 'v' })
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(almacen.getState().documento?.aberturas).toHaveLength(0)
    almacen.getState().seleccionar({ tipo: 'estructura', id: 'c' })
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(almacen.getState().documento?.estructura).toHaveLength(0)
  })

  it('Supr con un vértice seleccionado quita la esquina', () => {
    almacen.getState().seleccionar({ tipo: 'vertice', indice: 2 })
    render(<Sonda />)
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(almacen.getState().documento?.estancia.planta).toHaveLength(3)
    expect(almacen.getState().seleccion).toBeNull()
  })
})
