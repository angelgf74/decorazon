// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { anadirElemento, catalogoBase, type Abertura, type DocumentoDiseno } from '../../nucleo'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import { conflictosDe } from '../estado/conflictos'
import ListaAvisos from './ListaAvisos'

const puerta: Abertura = { id: 'p', tipo: 'puerta', pared: 0, posicion: 20, ancho: 80, alto: 210, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' }

function poner(doc: DocumentoDiseno, tipo: string, x: number, y: number): DocumentoDiseno {
  return anadirElemento(doc, catalogoBase, tipo, { x, y }).documento
}

beforeEach(() => {
  reiniciarAlmacen()
  almacen.getState().crear('dormitorio', 400, 330, 250)
})

describe('ListaAvisos', () => {
  it('sin conflictos dice que todo cabe', () => {
    render(<ListaAvisos />)
    expect(screen.getByText('Todo cabe y se abre')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Avisos (0)' })).toBeTruthy()
  })

  it('con un solape y un paso estrecho, el solape va primero', () => {
    let doc = almacen.getState().documento!
    doc = poner(doc, 'cama', 100, 200)
    doc = poner(doc, 'cama', 100, 200)
    const gravedades = conflictosDe(doc).map((c) => c.gravedad)
    expect(gravedades).toContain('error')
    expect(gravedades).toContain('aviso')
    almacen.getState().cambiar(() => doc)
    render(<ListaAvisos />)
    const botones = screen.getAllByRole('button')
    expect(botones[0]!.textContent).toContain('se solapan')
    expect(botones[botones.length - 1]!.textContent).toContain('Paso estrecho')
    expect(botones).toHaveLength(gravedades.length)
    expect(screen.getByRole('heading', { name: `Avisos (${gravedades.length})` })).toBeTruthy()
  })

  it('pulsar el aviso de una puerta va al paso 1 y la selecciona', async () => {
    let doc: DocumentoDiseno = { ...almacen.getState().documento!, aberturas: [puerta] }
    doc = poner(doc, 'armario', 60, 40)
    const c = conflictosDe(doc).find((x) => x.ids[0] === 'p')
    expect(c).toBeTruthy()
    almacen.getState().cambiar(() => doc)
    almacen.getState().irAPaso(2)
    render(<ListaAvisos />)
    await userEvent.click(screen.getByRole('button', { name: c!.mensaje }))
    expect(almacen.getState().paso).toBe(1)
    expect(almacen.getState().seleccion).toEqual({ tipo: 'abertura', id: 'p' })
  })

  it('pulsar el aviso de un mueble va al paso 2 y lo selecciona', async () => {
    let doc = almacen.getState().documento!
    doc = poner(doc, 'cama', 100, 200)
    doc = poner(doc, 'cama', 100, 200)
    almacen.getState().cambiar(() => doc)
    almacen.getState().irAPaso(1)
    render(<ListaAvisos />)
    await userEvent.click(screen.getAllByRole('button')[0]!)
    expect(almacen.getState().paso).toBe(2)
    expect(almacen.getState().seleccion).toEqual({ tipo: 'elemento', id: doc.elementos[0]!.id })
  })
})
