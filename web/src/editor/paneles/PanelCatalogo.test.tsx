// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import PanelCatalogo from './PanelCatalogo'

beforeEach(() => {
  reiniciarAlmacen()
})

describe('PanelCatalogo', () => {
  it('en una cocina, el primer grupo es "Para tu cocina" y contiene el módulo bajo', () => {
    almacen.getState().crear('cocina', 400, 330, 250)
    render(<PanelCatalogo />)
    const grupos = screen.getAllByRole('region')
    expect(grupos[0]).toBe(screen.getByRole('region', { name: 'Para tu cocina' }))
    expect(within(grupos[0]!).getByRole('button', { name: /^Módulo bajo/ })).toBeTruthy()
  })

  it('pulsar "Armario" en "Otros muebles" lo añade en el centro y lo deja seleccionado', async () => {
    almacen.getState().crear('salon', 400, 330, 250)
    almacen.getState().irAPaso(2)
    render(<PanelCatalogo />)
    const otros = screen.getByRole('region', { name: 'Otros muebles' })
    const boton = within(otros).getByRole('button', { name: /^Armario/ })
    expect(boton.getAttribute('draggable')).toBe('true')
    expect(boton.textContent).toContain('100 × 60 cm')
    await userEvent.click(boton)
    const { documento, seleccion } = almacen.getState()
    expect(documento!.elementos).toHaveLength(1)
    const armario = documento!.elementos[0]!
    expect(armario.tipo).toBe('armario')
    expect(seleccion).toEqual({ tipo: 'elemento', id: armario.id })
  })
})
