// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { evento } from '../../analitica'
import { textos } from '../../textos'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import { reiniciarCatalogoLocal } from './catalogoLocal'
import PanelCatalogo from './PanelCatalogo'
import { ESPERA_BUSQUEDA_MS } from './usarBusquedaSinResultados'

vi.mock('../../analitica', () => ({ evento: vi.fn() }))

const escribir = (texto: string) => fireEvent.change(screen.getByRole('searchbox', { name: textos.catalogo.buscar }), { target: { value: texto } })
const esperar = (ms = ESPERA_BUSQUEDA_MS) => act(() => { vi.advanceTimersByTime(ms) })
const sinResultados = () => vi.mocked(evento).mock.calls.filter(([nombre]) => nombre === 'catalogo-sin-resultados')

beforeEach(() => {
  vi.useFakeTimers()
  reiniciarAlmacen()
  localStorage.clear()
  reiniciarCatalogoLocal()
  almacen.getState().crear('dormitorio', 400, 330, 250)
  vi.mocked(evento).mockClear()
  render(<PanelCatalogo />)
})
afterEach(() => vi.useRealTimers())

describe('PanelCatalogo: búsquedas sin resultado (lo que falta en el catálogo)', () => {
  it('una búsqueda que no encuentra nada se cuenta al dejar de escribir, sin tildes ni mayúsculas', () => {
    escribir('Líter')
    escribir('Litera')
    esperar(ESPERA_BUSQUEDA_MS - 1)
    expect(sinResultados()).toEqual([])
    esperar(1)
    expect(sinResultados()).toEqual([['catalogo-sin-resultados', { texto: 'litera' }]])
  })

  it('lo que sí encuentra algo no se cuenta', () => {
    escribir('cama')
    esperar()
    expect(sinResultados()).toEqual([])
  })

  it('se mira en todo el catálogo, no solo en el grupo del chip pulsado', () => {
    // «fregadero» no es del dormitorio, pero existe: no falta nada.
    escribir('fregadero')
    esperar()
    expect(sinResultados()).toEqual([])
  })

  it('menos de 3 letras no se cuenta, y la misma búsqueda solo una vez', () => {
    escribir('zq')
    esperar()
    escribir('zapatero')
    esperar()
    escribir('')
    escribir('zapatero')
    esperar()
    expect(sinResultados()).toEqual([['catalogo-sin-resultados', { texto: 'zapatero' }]])
  })

  it('el texto va recortado a 30 caracteres', () => {
    escribir('un mueble con un nombre larguisimo que no existe')
    esperar()
    expect(sinResultados()[0]![1]).toEqual({ texto: 'un mueble con un nombre largui' })
  })

  it('nada que parezca un dato personal: ni con @ ni con 4 cifras seguidas', () => {
    escribir('ana@correo.es')
    esperar()
    escribir('llamar 612345678')
    esperar()
    expect(sinResultados()).toEqual([])
  })
})
