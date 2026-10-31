// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { contienePunto } from '../../nucleo/geometria/poligono'
import { textos } from '../../textos'
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

describe('PanelCatalogo en una L', () => {
  it('pulsar un tipo lo añade dentro de la planta aunque el centro de la caja caiga fuera', async () => {
    const ele = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 150 }, { x: 150, y: 150 }, { x: 150, y: 400 }, { x: 0, y: 400 }]
    almacen.getState().crear('salon', 400, 400, 250)
    almacen.getState().cambiar((d) => ({ ...d, estancia: { ...d.estancia, planta: ele } }))
    almacen.getState().irAPaso(2)
    render(<PanelCatalogo />)
    await userEvent.click(within(screen.getByRole('region', { name: 'Otros muebles' })).getByRole('button', { name: /^Armario/ }))
    const armario = almacen.getState().documento!.elementos[0]!
    expect(contienePunto(ele, armario.posicion)).toBe(true)
  })

  it('el buscador filtra sin distinguir mayúsculas ni tildes', async () => {
    almacen.getState().crear('dormitorio', 400, 330, 250)
    render(<PanelCatalogo />)
    await userEvent.type(screen.getByRole('searchbox', { name: textos.catalogo.buscar }), 'LAMPARA')
    expect(screen.getByRole('button', { name: /^Lámpara de pie/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Armario/ })).toBeNull()
  })

  it('sin coincidencias lo dice y no deja grupos vacíos', async () => {
    almacen.getState().crear('dormitorio', 400, 330, 250)
    render(<PanelCatalogo />)
    await userEvent.type(screen.getByRole('searchbox', { name: textos.catalogo.buscar }), 'zzz')
    expect(screen.getByText(textos.catalogo.sinResultados)).toBeInTheDocument()
    expect(screen.queryAllByRole('region')).toHaveLength(0)
  })
})
