// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { textos } from '../../textos'
import DialogoCompartir from './DialogoCompartir'

const DISENO = { id: 'b', nombre: 'Salón', tipoEstancia: 'salon', fechaDeCreacion: 'x', fechaDeModificacion: 'x', version: 1, enlace: 'tok_1' }

afterEach(() => vi.unstubAllGlobals())

function conShare(share: ((datos: ShareData) => Promise<void>) | undefined) {
  vi.stubGlobal('navigator', Object.create(navigator, share ? { share: { value: share, configurable: true } } : {}))
}

describe('DialogoCompartir: enviar con la hoja del sistema', () => {
  it('con navigator.share, «Enviar» comparte el nombre y la dirección del enlace', async () => {
    const share = vi.fn(async () => {})
    conShare(share)
    render(<DialogoCompartir diseno={DISENO} alCambiar={() => {}} alCerrar={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: textos.compartir.enviar }))
    expect(share).toHaveBeenCalledWith({ title: 'Salón', url: `${location.origin}/compartido/tok_1` })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('cancelar la hoja del sistema (AbortError) no es un error; otro fallo sí avisa', async () => {
    const share = vi.fn()
      .mockRejectedValueOnce(new DOMException('cancelado', 'AbortError'))
      .mockRejectedValueOnce(new DOMException('no se puede', 'NotAllowedError'))
    conShare(share)
    render(<DialogoCompartir diseno={DISENO} alCambiar={() => {}} alCerrar={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: textos.compartir.enviar }))
    expect(screen.queryByRole('alert')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: textos.compartir.enviar }))
    expect(await screen.findByRole('alert')).toHaveTextContent(textos.compartir.noEnviado)
  })

  it('sin navigator.share no hay botón «Enviar» y sigue «Copiar enlace»', () => {
    conShare(undefined)
    render(<DialogoCompartir diseno={DISENO} alCambiar={() => {}} alCerrar={() => {}} />)
    expect(screen.queryByRole('button', { name: textos.compartir.enviar })).toBeNull()
    expect(screen.getByRole('button', { name: textos.compartir.copiar })).toBeInTheDocument()
  })
})
