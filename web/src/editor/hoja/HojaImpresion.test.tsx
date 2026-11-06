// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { catalogoBase, elementoNuevo } from '../../nucleo'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import HojaImpresion from './HojaImpresion'

beforeEach(() => {
  reiniciarAlmacen()
  almacen.getState().crear('cocina', 400, 300, 250)
  almacen.getState().cambiar((d) => ({
    ...d,
    elementos: [elementoNuevo(catalogoBase.get('armario')!, { x: 100, y: 50 }, 'a'), elementoNuevo(catalogoBase.get('fregadero')!, { x: 300, y: 40 }, 'f')],
    estructura: [{ id: 'col', tipo: 'columna', centro: { x: 380, y: 280 }, ancho: 30, fondo: 30, rotacion: 0 }],
  }))
})
afterEach(() => vi.restoreAllMocks())

describe('HojaImpresion', () => {
  it('cabecera con el nombre, el tipo y las medidas; plano con cotas y nombres; lista de muebles', () => {
    render(<HojaImpresion alCerrar={() => {}} />)
    const hoja = screen.getByRole('dialog', { name: 'Hoja para imprimir' })
    expect(within(hoja).getByRole('heading', { level: 1, name: 'Mi diseño' })).toBeInTheDocument()
    expect(within(hoja).getByText(/Cocina · 400 × 300 cm, 250 cm de alto · 12 m²/)).toBeInTheDocument()

    const plano = within(hoja).getByRole('img', { name: 'Plano' })
    const textos = [...plano.querySelectorAll('text')].map((n) => n.textContent)
    expect(textos).toEqual(expect.arrayContaining(['400 cm', '300 cm', 'Armario', 'Fregadero']))
    // La columna usa el rayado propio de la hoja: al imprimir, el del editor está oculto y no se pintaría.
    expect(plano.querySelector('pattern#hoja-rayado')).not.toBeNull()
    expect(plano.querySelector('[fill="url(#hoja-rayado)"]')).not.toBeNull()
    // Sin tiradores ni avisos.
    expect(plano.querySelector('[data-vertice], [data-partir], [data-zona-conflicto]')).toBeNull()

    const filas = within(within(hoja).getByRole('table')).getAllByRole('row').slice(1)
    expect(filas.map((f) => within(f).getAllByRole('cell')[0]!.textContent)).toEqual(['Armario', 'Fregadero'])
    expect(within(filas[1]!).getByText('A 85 cm del suelo')).toBeInTheDocument()
  })

  it('un diseño de la cuenta lleva su nombre', () => {
    const doc = almacen.getState().documento!
    almacen.getState().abrirDelServidor('11111111-1111-1111-1111-111111111111', 3, 'Cocina de la playa', doc)
    render(<HojaImpresion alCerrar={() => {}} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Cocina de la playa' })).toBeInTheDocument()
  })

  it('la vista 3D va en su propia página; sin WebGL lo dice y se puede imprimir igual', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => {})
    render(<HojaImpresion alCerrar={() => {}} />)
    const pagina3d = screen.getByRole('heading', { level: 2, name: 'Vista 3D' }).closest('.hoja-impresion__pagina')!
    expect(pagina3d).toHaveClass('hoja-impresion__pagina--3d')
    expect(within(pagina3d as HTMLElement).getByText('La vista 3D no está disponible en este dispositivo.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Imprimir o guardar PDF' }))
    expect(imprimir).toHaveBeenCalledOnce()
  })

  it('sin muebles lo dice en lugar de una tabla vacía', () => {
    almacen.getState().cambiar((d) => ({ ...d, elementos: [] }))
    render(<HojaImpresion alCerrar={() => {}} />)
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText('Aún no hay muebles en el diseño.')).toBeInTheDocument()
  })

  it('Cerrar y Escape la cierran', async () => {
    const alCerrar = vi.fn()
    render(<HojaImpresion alCerrar={alCerrar} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    await userEvent.keyboard('{Escape}')
    expect(alCerrar).toHaveBeenCalledTimes(2)
  })
})

describe('HojaImpresion con el documento por props (vista compartida)', () => {
  it('con doc y nombre no lee el almacén: pinta ese diseño con ese nombre', () => {
    const doc = almacen.getState().documento!
    reiniciarAlmacen()
    expect(almacen.getState().documento).toBeNull()
    render(<HojaImpresion doc={doc} nombre="Baño de arriba" alCerrar={() => {}} />)
    const hoja = screen.getByRole('dialog', { name: 'Hoja para imprimir' })
    expect(within(hoja).getByRole('heading', { level: 1, name: 'Baño de arriba' })).toBeInTheDocument()
    expect(within(hoja).getByRole('img', { name: 'Plano' })).toBeInTheDocument()
    expect(within(within(hoja).getByRole('table')).getByText('Armario')).toBeInTheDocument()
  })

  it('con doc pero sin nombre, «Mi diseño»', () => {
    const doc = almacen.getState().documento!
    reiniciarAlmacen()
    render(<HojaImpresion doc={doc} alCerrar={() => {}} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Mi diseño' })).toBeInTheDocument()
  })
})
