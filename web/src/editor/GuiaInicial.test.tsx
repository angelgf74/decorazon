// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { textos } from '../textos'
import GuiaInicial from './GuiaInicial'
import { CLAVE_GUIA, guiaVista, marcarGuiaVista } from './marcaDeGuia'

const t = textos.guia

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('GuiaInicial', () => {
  it('empieza en «1 de 3» con el primer paso y el anillo sobre el plano; «Siguiente» avanza y cambia el objetivo', async () => {
    render(<GuiaInicial alCerrar={() => {}} />)
    const guia = screen.getByRole('region', { name: t.titulo })
    expect(within(guia).getByText(t.pasoDe(1, 3))).toBeInTheDocument()
    expect(within(guia).getByRole('heading', { name: t.pasos[0]!.titulo })).toBeInTheDocument()
    expect(document.querySelector('.guia__objetivo')).toHaveAttribute('data-paso', '1')
    await userEvent.click(within(guia).getByRole('button', { name: t.siguiente }))
    expect(within(guia).getByText(t.pasoDe(2, 3))).toBeInTheDocument()
    expect(within(guia).getByRole('heading', { name: t.pasos[1]!.titulo })).toBeInTheDocument()
    expect(document.querySelector('.guia__objetivo')).toHaveAttribute('data-paso', '2')
    await userEvent.click(within(guia).getByRole('button', { name: t.siguiente }))
    expect(within(guia).getByText(t.pasoDe(3, 3))).toBeInTheDocument()
    // En el último paso no hay «Siguiente», y mientras no se cierra no hay marca.
    expect(within(guia).queryByRole('button', { name: t.siguiente })).toBeNull()
    expect(guiaVista()).toBe(false)
  })

  it('«Entendido» en el último paso avisa y deja la marca', async () => {
    const alCerrar = vi.fn()
    render(<GuiaInicial alCerrar={alCerrar} />)
    await userEvent.click(screen.getByRole('button', { name: t.siguiente }))
    await userEvent.click(screen.getByRole('button', { name: t.siguiente }))
    await userEvent.click(screen.getByRole('button', { name: t.terminar }))
    expect(alCerrar).toHaveBeenCalledOnce()
    expect(localStorage.getItem(CLAVE_GUIA)).toBe('vista')
    expect(guiaVista()).toBe(true)
  })

  it('«Saltar» cierra y deja la marca', async () => {
    const alCerrar = vi.fn()
    render(<GuiaInicial alCerrar={alCerrar} />)
    await userEvent.click(screen.getByRole('button', { name: t.saltar }))
    expect(alCerrar).toHaveBeenCalledOnce()
    expect(guiaVista()).toBe(true)
  })

  it('Escape también la salta', async () => {
    const alCerrar = vi.fn()
    render(<GuiaInicial alCerrar={alCerrar} />)
    await userEvent.keyboard('{Escape}')
    expect(alCerrar).toHaveBeenCalledOnce()
    expect(guiaVista()).toBe(true)
  })

  it('con un localStorage que lanza, no rompe: la guía se enseña y se puede saltar', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado') })
    expect(guiaVista()).toBe(false)
    const alCerrar = vi.fn()
    render(<GuiaInicial alCerrar={alCerrar} />)
    await userEvent.click(screen.getByRole('button', { name: t.saltar }))
    expect(alCerrar).toHaveBeenCalledOnce()
    expect(() => marcarGuiaVista()).not.toThrow()
  })
})
