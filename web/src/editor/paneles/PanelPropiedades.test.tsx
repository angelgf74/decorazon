// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { longitudPared, type Abertura } from '../../nucleo'
import { textos } from '../../textos'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import PanelPropiedades from './PanelPropiedades'

const puerta: Abertura = { id: 'p', tipo: 'puerta', pared: 0, posicion: 50, ancho: 82, alto: 203, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' }

beforeEach(() => {
  reiniciarAlmacen()
  almacen.getState().crear('dormitorio', 400, 330, 250)
})

async function escribir(etiqueta: string, valor: string) {
  const campo = screen.getByLabelText(etiqueta)
  await userEvent.clear(campo)
  await userEvent.type(campo, `${valor}{Enter}`)
}

describe('PanelPropiedades en el paso 1', () => {
  it('una posición que saca la puerta de su pared se rechaza con aviso', async () => {
    almacen.getState().cambiar((d) => ({ ...d, aberturas: [puerta] }))
    almacen.getState().seleccionar({ tipo: 'abertura', id: 'p' })
    render(<PanelPropiedades />)
    await escribir('Posición', '390')
    expect(almacen.getState().documento!.aberturas[0]!.posicion).toBe(50)
    expect(almacen.getState().aviso).toBe(textos.edicion.noCabeEnPared)
    expect((screen.getByLabelText('Posición') as HTMLInputElement).value).toBe('50')
  })

  it('alarga la pared 0 y la parte en dos', async () => {
    almacen.getState().seleccionar({ tipo: 'pared', indice: 0 })
    render(<PanelPropiedades />)
    expect(screen.getByText('Pared 1')).toBeTruthy()
    await escribir('Longitud', '450')
    await userEvent.click(screen.getByRole('button', { name: 'Partir pared' }))
    const planta = almacen.getState().documento!.estancia.planta
    expect(planta).toHaveLength(5)
    expect(longitudPared(planta, 0)).toBe(225)
  })

  it('"Quitar esquina" en el vértice 2 deja un triángulo', async () => {
    almacen.getState().seleccionar({ tipo: 'vertice', indice: 2 })
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: 'Quitar esquina' }))
    expect(almacen.getState().documento!.estancia.planta).toEqual([{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 0, y: 330 }])
  })

  it('"Quitar" borra la abertura seleccionada', async () => {
    almacen.getState().cambiar((d) => ({ ...d, aberturas: [puerta] }))
    almacen.getState().seleccionar({ tipo: 'abertura', id: 'p' })
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: 'Quitar' }))
    expect(almacen.getState().documento!.aberturas).toHaveLength(0)
    expect(almacen.getState().seleccion).toBeNull()
  })
})
