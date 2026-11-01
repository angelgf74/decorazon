// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import NuevaEstancia from './NuevaEstancia'

beforeEach(() => reiniciarAlmacen())

describe('NuevaEstancia', () => {
  it('crea una cocina de 500 de ancho', async () => {
    render(<NuevaEstancia />)
    await userEvent.click(screen.getByRole('radio', { name: 'Cocina' }))
    const ancho = screen.getByLabelText('Ancho')
    await userEvent.clear(ancho)
    await userEvent.type(ancho, '500{Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Crear estancia' }))
    const doc = almacen.getState().documento
    expect(doc?.estancia.tipo).toBe('cocina')
    expect(doc!.estancia.planta[1]!.x - doc!.estancia.planta[0]!.x).toBe(500)
    expect(doc!.estancia.planta[2]!.y).toBe(330)
    expect(doc?.estancia.alto).toBe(250)
  })

  it('crea un despacho', async () => {
    render(<NuevaEstancia />)
    await userEvent.click(screen.getByRole('radio', { name: 'Despacho' }))
    await userEvent.click(screen.getByRole('button', { name: 'Crear estancia' }))
    expect(almacen.getState().documento?.estancia.tipo).toBe('despacho')
  })

  it('Intro en un campo confirma el valor sin enviar el formulario', async () => {
    render(<NuevaEstancia />)
    const ancho = screen.getByLabelText('Ancho')
    await userEvent.clear(ancho)
    await userEvent.type(ancho, '600{Enter}')
    expect(almacen.getState().documento).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Crear estancia' }))
    expect(almacen.getState().documento!.estancia.planta[1]!.x).toBe(600)
  })

  it('crea con los valores por defecto', async () => {
    render(<NuevaEstancia />)
    await userEvent.click(screen.getByRole('button', { name: 'Crear estancia' }))
    expect(almacen.getState().documento?.estancia.tipo).toBe('dormitorio')
  })
})
