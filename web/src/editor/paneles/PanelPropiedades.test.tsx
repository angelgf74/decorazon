// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { anadirElemento, catalogoBase, longitudPared, type Abertura } from '../../nucleo'
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

function colocar(tipo: string): string {
  const r = anadirElemento(almacen.getState().documento!, catalogoBase, tipo, { x: 200, y: 165 })
  almacen.getState().cambiar(() => r.documento)
  almacen.getState().irAPaso(2)
  almacen.getState().seleccionar({ tipo: 'elemento', id: r.id })
  return r.id
}

describe('PanelPropiedades con un elemento', () => {
  const elemento = () => almacen.getState().documento!.elementos[0]!

  it('un ancho fuera de rango se ajusta al máximo del tipo', async () => {
    colocar('armario')
    render(<PanelPropiedades />)
    expect(screen.getByRole('heading', { name: 'Armario' })).toBeTruthy()
    await escribir('Ancho', '9999')
    expect(elemento().medidas.ancho).toBe(400)
  })

  it('con puertas correderas el armario no tiene zonas de apertura', async () => {
    colocar('armario')
    render(<PanelPropiedades />)
    await userEvent.selectOptions(screen.getByLabelText('Puertas'), 'correderas')
    expect(elemento().variantes.puertas).toBe('correderas')
    expect(catalogoBase.get('armario')!.zonasApertura(elemento())).toEqual([])
    expect((screen.getByRole('option', { name: 'Correderas' }) as HTMLOptionElement).selected).toBe(true)
  })

  it('"Duplicar" añade una copia y "Borrar" quita el elemento y la selección', async () => {
    colocar('armario')
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: 'Duplicar' }))
    expect(almacen.getState().documento!.elementos).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }))
    expect(almacen.getState().documento!.elementos).toHaveLength(1)
    act(() => almacen.getState().seleccionar({ tipo: 'elemento', id: elemento().id }))
    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }))
    expect(almacen.getState().documento!.elementos).toHaveLength(0)
    expect(almacen.getState().seleccion).toBeNull()
  })

  it('solo los tipos con altura editable tienen el campo de altura desde el suelo', () => {
    colocar('armario')
    const { unmount } = render(<PanelPropiedades />)
    expect(screen.queryByLabelText('Altura desde el suelo')).toBeNull()
    unmount()
    colocar('cuadro')
    render(<PanelPropiedades />)
    expect(screen.getByLabelText('Altura desde el suelo')).toBeTruthy()
    expect(screen.getByText('0–210 cm')).toBeTruthy()
  })

  it('cada elección de color es un paso de deshacer', () => {
    colocar('armario')
    render(<PanelPropiedades />)
    const color = screen.getByLabelText('Cuerpo')
    const inicial = elemento().colores.cuerpo
    fireEvent.input(color, { target: { value: '#111111' } })
    fireEvent.input(color, { target: { value: '#222222' } })
    fireEvent.change(color)
    fireEvent.input(color, { target: { value: '#333333' } })
    fireEvent.blur(color)
    expect(elemento().colores.cuerpo).toBe('#333333')
    almacen.getState().deshacer()
    expect(elemento().colores.cuerpo).toBe('#222222')
    almacen.getState().deshacer()
    expect(elemento().colores.cuerpo).toBe(inicial)
  })
})
