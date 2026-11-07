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

  it('crea un baño', async () => {
    render(<NuevaEstancia />)
    await userEvent.click(screen.getByRole('radio', { name: 'Baño' }))
    await userEvent.click(screen.getByRole('button', { name: 'Crear estancia' }))
    expect(almacen.getState().documento?.estancia.tipo).toBe('bano')
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

describe('NuevaEstancia: forma de la planta', () => {
  const puntosDelDibujo = () => (document.querySelector('.nueva-estancia__dibujo polygon')!.getAttribute('points') ?? '').trim().split(/\s+/).length

  it('«En L» enseña las medidas del entrante y su esquina, el dibujo pasa a 6 puntos y la estancia creada es una L', async () => {
    render(<NuevaEstancia />)
    expect(screen.queryByLabelText('Entrante ancho')).toBeNull()
    expect(puntosDelDibujo()).toBe(4)
    await userEvent.click(screen.getByRole('radio', { name: 'En L' }))
    expect(puntosDelDibujo()).toBe(6)
    const entrante = screen.getByLabelText('Entrante ancho')
    await userEvent.clear(entrante)
    await userEvent.type(entrante, '200{Enter}')
    await userEvent.selectOptions(screen.getByLabelText('Esquina del entrante'), 'arriba-izquierda')
    await userEvent.click(screen.getByRole('button', { name: 'Crear estancia' }))
    const planta = almacen.getState().documento!.estancia.planta
    expect(planta).toHaveLength(6)
    expect(planta).toContainEqual({ x: 200, y: 110 })
    expect(planta).not.toContainEqual({ x: 0, y: 0 })
  })

  it('«Rectángulo» vuelve a los 4 puntos', async () => {
    render(<NuevaEstancia />)
    await userEvent.click(screen.getByRole('radio', { name: 'En L' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Rectángulo' }))
    expect(puntosDelDibujo()).toBe(4)
    expect(screen.queryByLabelText('Entrante ancho')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Crear estancia' }))
    expect(almacen.getState().documento!.estancia.planta).toHaveLength(4)
  })

  it('si el ancho baja por debajo del entrante, el campo enseña lo que se va a crear', async () => {
    render(<NuevaEstancia />)
    await userEvent.click(screen.getByRole('radio', { name: 'En L' }))
    expect((screen.getByLabelText('Entrante ancho') as HTMLInputElement).value).toBe('133')
    const ancho = screen.getByLabelText('Ancho')
    await userEvent.clear(ancho)
    await userEvent.type(ancho, '150{Enter}')
    expect((screen.getByLabelText('Entrante ancho') as HTMLInputElement).value).toBe('100')
    await userEvent.click(screen.getByRole('button', { name: 'Crear estancia' }))
    const planta = almacen.getState().documento!.estancia.planta
    expect(planta).toContainEqual({ x: 50, y: 220 })
  })
})
