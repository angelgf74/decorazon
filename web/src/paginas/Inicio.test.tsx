// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { CLAVE_SESION, reiniciarSesion } from '../cuenta/sesion'
import { almacen, reiniciarAlmacen } from '../editor/estado/almacen'
import { catalogoBase, documentoNuevo, elementoNuevo } from '../nucleo'
import { textos } from '../textos'
import Inicio from './Inicio'

function montar() {
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/disenar" element={<p>pantalla del editor</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  reiniciarSesion()
  reiniciarAlmacen()
})

describe('Inicio', () => {
  it('sin documento ofrece empezar', () => {
    montar()
    expect(screen.getByRole('link', { name: 'Empezar a diseñar' })).toHaveAttribute('href', '/disenar')
    expect(screen.queryByText('Empezar uno nuevo')).not.toBeInTheDocument()
  })

  it('con documento ofrece seguir y empezar uno nuevo', () => {
    almacen.getState().crear('salon', 400, 330, 250)
    montar()
    expect(screen.getByRole('link', { name: 'Seguir con tu diseño' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Empezar uno nuevo' })).toBeInTheDocument()
  })

  it('"Empezar uno nuevo" confirma, descarta y navega', async () => {
    almacen.getState().crear('salon', 400, 330, 250)
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Empezar uno nuevo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar' }))
    expect(almacen.getState().documento).toBeNull()
    expect(screen.getByText('pantalla del editor')).toBeInTheDocument()
  })

  it('sin sesión ofrece entrar o crear cuenta, y no Mis diseños', () => {
    montar()
    const cuenta = screen.getByRole('region', { name: '¿Ya tienes cuenta?' })
    expect(within(cuenta).getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar')
    expect(within(cuenta).getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/registro')
    expect(screen.queryByRole('link', { name: 'Mis diseños' })).toBeNull()
  })

  it('con sesión ofrece Mis diseños y Mi cuenta, y no Entrar', () => {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: new Date(Date.now() + 86_400_000).toISOString() }))
    reiniciarSesion()
    montar()
    const cuenta = screen.getByRole('region', { name: 'Tu cuenta' })
    expect(within(cuenta).getByRole('link', { name: 'Mis diseños' })).toHaveAttribute('href', '/disenos')
    expect(within(cuenta).getByRole('link', { name: 'Mi cuenta' })).toHaveAttribute('href', '/cuenta')
    expect(screen.queryByRole('link', { name: 'Entrar' })).toBeNull()
  })

  it('el pie enlaza a Privacidad y ofrece enviar una sugerencia', async () => {
    montar()
    // Por la clase y no por el rol: un <footer> dentro de <main> no es "contentinfo" en un navegador real.
    const pie = document.querySelector<HTMLElement>('.inicio__pie')!
    expect(within(pie).getByRole('link', { name: 'Privacidad' })).toHaveAttribute('href', '/privacidad')
    await userEvent.click(within(pie).getByRole('button', { name: 'Sugerencias' }))
    expect(screen.getByRole('dialog', { name: 'Envíanos una sugerencia' })).toBeInTheDocument()
  })

  it('"Empezar a diseñar" sigue siendo la acción principal, antes que la cuenta', () => {
    montar()
    const empezar = screen.getByRole('link', { name: 'Empezar a diseñar' })
    expect(empezar).toHaveClass('primario')
    expect(empezar.compareDocumentPosition(screen.getByRole('link', { name: 'Entrar' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('Inicio: abrir un fichero', () => {
  const ficheroValido = () => new File([JSON.stringify(documentoNuevo('cocina', 300, 250, 250))], 'Cocina.decorazon.json', { type: 'application/json' })
  const subir = (fichero: File) => userEvent.upload(screen.getByLabelText(textos.importar.abrir), fichero)

  it('con un fichero válido y sin diseño en el navegador, lo abre en el editor', async () => {
    montar()
    await subir(ficheroValido())
    expect(await screen.findByText('pantalla del editor')).toBeInTheDocument()
    const doc = almacen.getState().documento!
    expect(doc.estancia.tipo).toBe('cocina')
    expect(almacen.getState().origen.tipo).toBe('anonimo')
  })

  it('con un diseño en el navegador (con algo dentro) pregunta antes; «Cancelar» no cambia nada', async () => {
    almacen.getState().crear('salon', 400, 330, 250)
    almacen.getState().cambiar((d) => ({ ...d, elementos: [elementoNuevo(catalogoBase.get('sofa')!, { x: 200, y: 165 }, 's')] }))
    montar()
    await subir(ficheroValido())
    expect(await screen.findByText(textos.importar.sustituir)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: textos.comun.cancelar }))
    expect(almacen.getState().documento!.estancia.tipo).toBe('salon')
    expect(screen.queryByText('pantalla del editor')).toBeNull()
    // Y el mismo fichero se puede volver a elegir: el campo se vacía.
    await subir(ficheroValido())
    expect(await screen.findByText(textos.importar.sustituir)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: textos.compartir.sustituir }))
    expect(await screen.findByText('pantalla del editor')).toBeInTheDocument()
    expect(almacen.getState().documento!.estancia.tipo).toBe('cocina')
  })

  it('con un fichero que no es un diseño avisa y no cambia nada', async () => {
    montar()
    await subir(new File(['{"formato":1}'], 'otra-cosa.json', { type: 'application/json' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(textos.importar.noValido)
    expect(almacen.getState().documento).toBeNull()
    expect(screen.queryByText('pantalla del editor')).toBeNull()
  })
})
