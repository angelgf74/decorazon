// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAVE_SESION, conectarSesionConApi, reiniciarSesion } from '../cuenta/sesion'
import { EJEMPLOS } from '../ejemplos'
import { respuesta } from '../pruebas/respuesta'
import { almacen, reiniciarAlmacen } from '../editor/estado/almacen'
import { catalogoBase, documentoNuevo, elementoNuevo } from '../nucleo'
import { textos } from '../textos'
import Inicio from './Inicio'
import { evento } from '../analitica'

vi.mock('../analitica', () => ({ evento: vi.fn() }))

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
  vi.mocked(evento).mockClear()
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

describe('Inicio: ejemplos', () => {
  const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()
  const tarjeta = (nombre: RegExp) => screen.getByRole('article', { name: nombre })

  it('enseña tres ejemplos con su imagen, nombre y tipo, y «Abrir una copia» en cada uno', () => {
    montar()
    const seccion = screen.getByRole('region', { name: textos.inicio.ejemplos })
    const tarjetas = within(seccion).getAllByRole('article')
    expect(tarjetas).toHaveLength(3)
    expect(tarjetas.map((a) => a.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('Dormitorio'), expect.stringContaining('Salón'), expect.stringContaining('Cocina')]))
    for (const a of tarjetas) {
      expect(a.querySelector('img')).toHaveAttribute('src', expect.stringMatching(/^\/ejemplos\//))
      expect(within(a).getByRole('button', { name: textos.inicio.abrirCopia })).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: textos.inicio.guardarEnCuenta })).toBeNull()
  })

  it('«Abrir una copia» sin diseño en el navegador abre el editor con ese diseño, como anónimo', async () => {
    montar()
    await userEvent.click(within(tarjeta(/^Dormitorio/)).getByRole('button', { name: textos.inicio.abrirCopia }))
    expect(await screen.findByText('pantalla del editor')).toBeInTheDocument()
    const { documento, origen } = almacen.getState()
    expect(documento!.estancia.tipo).toBe('dormitorio')
    expect(documento!.elementos.length).toBeGreaterThanOrEqual(5)
    expect(origen.tipo).toBe('anonimo')
    // Se cuenta qué ejemplo se abre, por su nombre: nunca el documento.
    expect(evento).toHaveBeenCalledExactlyOnceWith('ejemplo-abierto', { ejemplo: 'Dormitorio de matrimonio' })
  })

  it('con un diseño con algo dentro pregunta antes; «Cancelar» no cambia nada y «Sustituir» lo abre', async () => {
    almacen.getState().crear('salon', 400, 330, 250)
    almacen.getState().cambiar((d) => ({ ...d, elementos: [elementoNuevo(catalogoBase.get('sofa')!, { x: 200, y: 165 }, 's')] }))
    montar()
    await userEvent.click(within(tarjeta(/^Cocina/)).getByRole('button', { name: textos.inicio.abrirCopia }))
    expect(await screen.findByText(textos.inicio.sustituirEjemplo)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: textos.comun.cancelar }))
    expect(almacen.getState().documento!.estancia.tipo).toBe('salon')
    expect(screen.queryByText('pantalla del editor')).toBeNull()
    await userEvent.click(within(tarjeta(/^Cocina/)).getByRole('button', { name: textos.inicio.abrirCopia }))
    await userEvent.click(await screen.findByRole('button', { name: textos.compartir.sustituir }))
    expect(await screen.findByText('pantalla del editor')).toBeInTheDocument()
    expect(almacen.getState().documento!.estancia.tipo).toBe('cocina')
  })

  it('con sesión, «Guardar en mi cuenta» crea el diseño en la cuenta con el nombre del ejemplo y abre su editor', async () => {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: new Date(Date.now() + 86_400_000).toISOString() }))
    reiniciarSesion()
    conectarSesionConApi()
    fetchSimulado.mockReset()
    vi.stubGlobal('fetch', fetchSimulado)
    let enviado: { nombre: string; tipoEstancia: string } | null = null
    fetchSimulado.mockImplementationOnce(async (p) => {
      enviado = await p.json() as typeof enviado
      return respuesta(201, { id: 'nuevo', nombre: enviado!.nombre, tipoEstancia: 'salon', fechaDeCreacion: 'x', fechaDeModificacion: 'x', version: 1, contenido: EJEMPLOS[1]!.documento, enlace: null })
    })
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/disenos/:id" element={<p>editor de la cuenta</p>} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.click(within(tarjeta(/^Salón/)).getByRole('button', { name: textos.inicio.guardarEnCuenta }))
    expect(await screen.findByText('editor de la cuenta')).toBeInTheDocument()
    expect(enviado).toMatchObject({ tipoEstancia: 'salon' })
    expect(enviado!.nombre).toMatch(/^Salón/)
    const alta = fetchSimulado.mock.calls[0]![0]
    expect(`${alta.method} ${new URL(alta.url).pathname}`).toBe('POST /disenos')
    vi.unstubAllGlobals()
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
