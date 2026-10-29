// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { catalogoBase, elementoNuevo } from '../../nucleo'
import { textos } from '../../textos'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import { conflictosDe } from '../estado/conflictos'
import PanelEstancia from './PanelEstancia'

beforeEach(() => {
  reiniciarAlmacen()
  almacen.getState().crear('dormitorio', 400, 330, 250)
})

async function escribir(etiqueta: string, valor: string) {
  const campo = screen.getByLabelText(etiqueta)
  await userEvent.clear(campo)
  await userEvent.type(campo, `${valor}{Enter}`)
}

describe('PanelEstancia', () => {
  it('estrechar la estancia deja el armario donde estaba y en conflicto', async () => {
    const def = catalogoBase.get('armario')
    if (!def) throw new Error('armario')
    almacen.getState().cambiar((d) => ({ ...d, elementos: [elementoNuevo(def, { x: 350, y: 100 }, 'a')] }))
    render(<PanelEstancia />)
    await escribir('Ancho', '300')
    const doc = almacen.getState().documento!
    expect(Math.max(...doc.estancia.planta.map((p) => p.x))).toBe(300)
    expect(doc.elementos).toHaveLength(1)
    expect(doc.elementos[0]!.posicion).toEqual({ x: 350, y: 100 })
    expect(conflictosDe(doc).some((c) => c.tipo === 'fueraDeEstancia' && c.ids[0] === 'a')).toBe(true)
  })

  it('"Añadir puerta" pone una puerta en la pared 0 y la selecciona', async () => {
    render(<PanelEstancia />)
    await userEvent.click(screen.getByRole('button', { name: 'Añadir puerta' }))
    const { documento, seleccion } = almacen.getState()
    expect(documento!.aberturas).toHaveLength(1)
    const puerta = documento!.aberturas[0]!
    expect(puerta.tipo).toBe('puerta')
    expect(puerta.pared).toBe(0)
    expect(seleccion).toEqual({ tipo: 'abertura', id: puerta.id })
  })

  it('en una planta no rectangular no hay campo de ancho y lo explica', () => {
    almacen.getState().cambiar((d) => ({
      ...d,
      estancia: { ...d.estancia, planta: [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 330 }, { x: 200, y: 330 }, { x: 200, y: 200 }, { x: 0, y: 200 }] },
    }))
    render(<PanelEstancia />)
    expect(screen.queryByLabelText('Ancho')).toBeNull()
    expect(screen.getByText(textos.edicion.noRectangular)).toBeTruthy()
  })

  it('dos elecciones en el selector de color son dos pasos de deshacer', () => {
    render(<PanelEstancia />)
    const color = screen.getByLabelText('Color de las paredes')
    const inicial = almacen.getState().documento!.estancia.colorParedes
    fireEvent.input(color, { target: { value: '#111111' } })
    fireEvent.input(color, { target: { value: '#222222' } })
    fireEvent.change(color)
    fireEvent.input(color, { target: { value: '#333333' } })
    fireEvent.blur(color)
    almacen.getState().deshacer()
    expect(almacen.getState().documento!.estancia.colorParedes).toBe('#222222')
    almacen.getState().deshacer()
    expect(almacen.getState().documento!.estancia.colorParedes).toBe(inicial)
  })

  it('un alto por debajo de una puerta se rechaza con aviso y el grosor también se valida', async () => {
    almacen.getState().cambiar((d) => ({
      ...d,
      aberturas: [{ id: 'p', tipo: 'puerta', pared: 0, posicion: 20, ancho: 80, alto: 210, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' }],
    }))
    render(<PanelEstancia />)
    await escribir('Alto', '205')
    expect(almacen.getState().documento!.estancia.alto).toBe(250)
    expect(almacen.getState().aviso).toBe(textos.edicion.porEncimaDelTecho)
    await escribir('Alto', '230')
    expect(almacen.getState().documento!.estancia.alto).toBe(230)
    await escribir('Grosor de pared', '20')
    expect(almacen.getState().documento!.estancia.grosorPared).toBe(20)
  })
})
