// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAVE_SESION, reiniciarSesion, sesion } from '../../cuenta/sesion'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import { respuesta } from '../../pruebas/respuesta'
import { CLAVE_DISENO, guardarDisenoLocal } from '../persistencia/local'
import { textos } from '../../textos'
import BarraSuperior from './BarraSuperior'

const sincronizacion = vi.hoisted(() => ({ renombrar: vi.fn(), abrirDiseno: vi.fn(), esperarGuardados: vi.fn(async () => {}) }))
vi.mock('../persistencia/sincronizacion', () => sincronizacion)
// El estado de instalación (M-25) lo fija cada test: el real depende de un evento del navegador.
const instalacion = vi.hoisted(() => ({ estado: 'no' as 'no' | 'aviso' | 'ios', instalar: vi.fn(async () => true) }))
vi.mock('../../instalacion', () => ({ useEstadoDeInstalacion: () => instalacion.estado, instalar: instalacion.instalar }))

beforeEach(() => {
  localStorage.clear()
  reiniciarSesion()
  reiniciarAlmacen()
  almacen.getState().crear('salon', 400, 330, 250)
})

describe('BarraSuperior', () => {
  it('deshacer y rehacer están desactivados al crear', () => {
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Rehacer' })).toBeDisabled()
  })

  it('deshacer se activa tras un cambio', () => {
    almacen.getState().cambiar((d) => ({ ...d, estancia: { ...d.estancia, alto: 260 } }))
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeEnabled()
  })

  it('pulsar "2 Amueblar" pasa al paso 2 y lo marca', async () => {
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    expect(screen.getByRole('button', { name: '1 Estancia' })).toHaveAttribute('aria-current', 'step')
    await userEvent.click(screen.getByRole('button', { name: '2 Amueblar' }))
    expect(almacen.getState().paso).toBe(2)
    expect(screen.getByRole('button', { name: '2 Amueblar' })).toHaveAttribute('aria-current', 'step')
  })

  it('el selector 2D/3D ya no va en la barra: está sobre el plano (Editor)', () => {
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    expect(screen.queryByRole('button', { name: '3D' })).toBeNull()
    expect(screen.queryByRole('button', { name: '2D' })).toBeNull()
  })

  it('con el menú cerrado, "Nuevo diseño", "Imprimir" y "Sugerencias" no están en la página', () => {
    render(<BarraSuperior alImprimir={() => {}} />, { wrapper: MemoryRouter })
    expect(screen.queryByRole('button', { name: 'Nuevo diseño' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Imprimir' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Sugerencias' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Más acciones' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('"Más acciones" abre el menú con Nuevo diseño, Imprimir y Sugerencias; Escape lo cierra y deja el foco en el botón', async () => {
    render(<BarraSuperior alImprimir={() => {}} />, { wrapper: MemoryRouter })
    const mas = screen.getByRole('button', { name: 'Más acciones' })
    await userEvent.click(mas)
    expect(mas).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Nuevo diseño' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sugerencias' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('button', { name: 'Imprimir' })).toBeNull()
    expect(mas).toHaveFocus()
  })

  it('elegir "Imprimir" cierra el menú, devuelve el foco a "Más acciones" y avisa', async () => {
    const alImprimir = vi.fn(() => expect(screen.getByRole('button', { name: 'Más acciones' })).toHaveFocus())
    render(<BarraSuperior alImprimir={alImprimir} />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    await userEvent.click(screen.getByRole('button', { name: 'Imprimir' }))
    expect(alImprimir).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Imprimir' })).toBeNull()
  })

  it('pulsar fuera cierra el menú', async () => {
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    await userEvent.click(screen.getByRole('button', { name: '1 Estancia' }))
    expect(screen.queryByRole('button', { name: 'Nuevo diseño' })).toBeNull()
  })

  it('"Nuevo diseño" pide confirmación y descarta', async () => {
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    await userEvent.click(screen.getByRole('button', { name: 'Nuevo diseño' }))
    expect(screen.getByText(/reemplaza tu diseño actual/)).toBeInTheDocument()
    expect(almacen.getState().documento).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar' }))
    expect(almacen.getState().documento).toBeNull()
  })

  it('cancelar no descarta', async () => {
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    await userEvent.click(screen.getByRole('button', { name: 'Nuevo diseño' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(almacen.getState().documento).not.toBeNull()
  })

  it('muestra el estado de guardado', () => {
    almacen.getState().marcarGuardado('error')
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    expect(screen.getByText('No se pudo guardar en este navegador')).toBeInTheDocument()
  })

  it('sin sesión ofrece entrar', () => {
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar')
    expect(screen.queryByRole('link', { name: 'Mis diseños' })).toBeNull()
  })

  it('con sesión y sin ella ofrece enviar una sugerencia desde el menú; el diálogo sobrevive al cierre del menú', async () => {
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sugerencias' }))
    expect(screen.queryByRole('button', { name: 'Sugerencias' })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Envíanos una sugerencia' })).toBeInTheDocument()
  })

  it('sin sesión "Guardar" lleva al registro', () => {
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    expect(screen.getByRole('link', { name: 'Guardar' })).toHaveAttribute('href', '/registro')
  })

  it('con sesión no ofrece "Guardar"', () => {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: new Date(Date.now() + 86_400_000).toISOString() }))
    reiniciarSesion()
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    expect(screen.queryByRole('link', { name: 'Guardar' })).toBeNull()
  })

  it('con sesión ofrece Mis diseños y el nombre enlaza a la cuenta', () => {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: new Date(Date.now() + 86_400_000).toISOString() }))
    reiniciarSesion()
    sesion.setState({ usuario: { nombre: 'Ana', correo: 'ana@x.es' } })
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    expect(screen.getByRole('link', { name: 'Mis diseños' })).toHaveAttribute('href', '/disenos')
    expect(screen.getByRole('link', { name: 'Ana' })).toHaveAttribute('href', '/cuenta')
    expect(screen.queryByRole('link', { name: 'Entrar' })).toBeNull()
  })

  describe('con un diseño del servidor', () => {
    beforeEach(() => {
      sincronizacion.renombrar.mockClear()
      almacen.getState().abrirDelServidor('d1', 4, 'Cocina', almacen.getState().documento!)
    })

    it.each([
      ['guardado', 'Guardado'],
      ['pendiente', 'Guardando…'],
      ['sinConexion', 'Sin conexión'],
      ['conflicto', 'Cambiado en otro sitio'],
      ['error', 'No se pudo guardar'],
    ] as const)('el indicador con "%s" dice "%s"', (g, texto) => {
      almacen.getState().marcarGuardado(g)
      render(<BarraSuperior />, { wrapper: MemoryRouter })
      expect(screen.getByRole('status')).toHaveTextContent(new RegExp(`^${texto}$`))
    })

    it('el menú no ofrece "Nuevo diseño" pero sí "Imprimir"', async () => {
      render(<BarraSuperior alImprimir={() => {}} />, { wrapper: MemoryRouter })
      await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
      expect(screen.queryByRole('button', { name: 'Nuevo diseño' })).toBeNull()
      expect(screen.getByRole('button', { name: 'Imprimir' })).toBeInTheDocument()
    })

    it('el nombre se edita y renombra al pulsar Intro; Escape lo deja como estaba', async () => {
      render(<BarraSuperior />, { wrapper: MemoryRouter })
      const campo = screen.getByRole('textbox', { name: 'Nombre del diseño' })
      expect(campo).toHaveValue('Cocina')
      await userEvent.clear(campo)
      await userEvent.type(campo, 'Otra{Escape}')
      expect(campo).toHaveValue('Cocina')
      expect(sincronizacion.renombrar).not.toHaveBeenCalled()
      await userEvent.clear(campo)
      await userEvent.type(campo, 'Cocina nueva{Enter}')
      expect(sincronizacion.renombrar).toHaveBeenCalledWith(almacen, 'Cocina nueva')
    })
  })
})

describe('BarraSuperior con sesión y un diseño anónimo', () => {
  const fetchSimulado = vi.fn<(peticion: Request) => Promise<Response>>()

  beforeEach(() => {
    fetchSimulado.mockReset()
    vi.stubGlobal('fetch', fetchSimulado)
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: new Date(Date.now() + 86_400_000).toISOString() }))
    reiniciarSesion()
    guardarDisenoLocal(localStorage, almacen.getState().documento)
  })
  afterEach(() => vi.unstubAllGlobals())

  function montar() {
    render(
      <MemoryRouter initialEntries={['/disenar']}>
        <Routes>
          <Route path="/disenar" element={<BarraSuperior />} />
          <Route path="/disenos/d9" element={<p>diseño d9</p>} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('"Guardar en mi cuenta" lo crea en la cuenta, descarta el anónimo y abre el diseño', async () => {
    const doc = almacen.getState().documento
    fetchSimulado.mockResolvedValueOnce(respuesta(201, {
      id: 'd9', nombre: 'Diseño sin título', tipoEstancia: 'salon', fechaDeCreacion: '2026-01-01T00:00:00Z',
      fechaDeModificacion: '2026-01-01T00:00:00Z', version: 1, contenido: doc,
    }))
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar en mi cuenta' }))
    expect(await screen.findByText('diseño d9')).toBeInTheDocument()
    const peticion = fetchSimulado.mock.calls[0][0]
    expect(peticion.method).toBe('POST')
    expect(await peticion.json()).toMatchObject({ nombre: 'Diseño sin título', tipoEstancia: 'salon' })
    expect(localStorage.getItem(CLAVE_DISENO)).toBeNull()
    expect(almacen.getState().documento).toBeNull()
  })

  it('con 409 avisa del límite y el diseño sigue en el navegador', async () => {
    // Dos 409: el primero puede ser un id en uso y se reintenta con otro; el segundo es el límite.
    fetchSimulado.mockResolvedValueOnce(respuesta(409, { mensaje: 'Has llegado al límite de 100 diseños' }))
    fetchSimulado.mockResolvedValueOnce(respuesta(409, { mensaje: 'Has llegado al límite de 100 diseños' }))
    montar()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar en mi cuenta' }))
    await vi.waitFor(() => expect(almacen.getState().aviso).toBe('Has llegado al límite de 100 diseños. Tu diseño sigue en este navegador.'))
    expect(localStorage.getItem(CLAVE_DISENO)).not.toBeNull()
    expect(almacen.getState().documento).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Guardar en mi cuenta' })).toBeEnabled()
  })

  it('con un diseño del servidor no ofrece "Guardar en mi cuenta"', () => {
    almacen.getState().abrirDelServidor('d1', 4, 'Cocina', almacen.getState().documento!)
    montar()
    expect(screen.queryByRole('button', { name: 'Guardar en mi cuenta' })).toBeNull()
  })

  it('sin sesión no ofrece "Guardar en mi cuenta"', () => {
    localStorage.removeItem(CLAVE_SESION)
    reiniciarSesion()
    montar()
    expect(screen.getByRole('link', { name: 'Guardar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar en mi cuenta' })).toBeNull()
  })
})

describe('BarraSuperior: descargas en el menú', () => {
  const nombres = ['Descargar imagen 3D', 'Descargar plano', 'Descargar diseño'] as const

  it('con el menú cerrado no están; abierto, están tras Imprimir y cada una devuelve el foco a "Más acciones" antes de actuar', async () => {
    const llamadas: string[] = []
    const alDescargar = (nombre: string) => vi.fn(() => {
      expect(screen.getByRole('button', { name: 'Más acciones' })).toHaveFocus()
      llamadas.push(nombre)
    })
    const [imagen, plano, diseno] = nombres.map(alDescargar)
    render(<BarraSuperior alImprimir={() => {}} alDescargarImagen={imagen} alDescargarPlano={plano} alDescargarDiseno={diseno} />, { wrapper: MemoryRouter })
    for (const n of nombres) expect(screen.queryByRole('button', { name: n })).toBeNull()
    for (const n of nombres) {
      await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
      const opciones = screen.getAllByRole('button').filter((b) => b.classList.contains('menu__opcion')).map((b) => b.textContent)
      expect(opciones.indexOf('Imprimir')).toBeLessThan(opciones.indexOf(n))
      await userEvent.click(screen.getByRole('button', { name: n }))
      expect(screen.queryByRole('button', { name: n })).toBeNull()
    }
    expect(llamadas).toEqual([...nombres])
  })

  it('mientras se prepara la imagen 3D, la opción lo dice y no se puede volver a pulsar', async () => {
    const imagen = vi.fn()
    render(<BarraSuperior alDescargarImagen={imagen} preparandoImagen />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    const opcion = screen.getByRole('button', { name: 'Preparando la imagen 3D…' })
    expect(opcion).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Descargar imagen 3D' })).toBeNull()
  })

  it('sin las funciones de descarga, el menú no las ofrece', async () => {
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    for (const n of nombres) expect(screen.queryByRole('button', { name: n })).toBeNull()
  })
})

describe('BarraSuperior: «Instalar Decorazon» (M-25)', () => {
  afterEach(() => { instalacion.estado = 'no'; instalacion.instalar.mockClear() })

  it('sin aviso del navegador no hay opción de instalar', async () => {
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    expect(screen.queryByRole('button', { name: 'Instalar Decorazon' })).toBeNull()
  })

  it('con el aviso guardado, elegir «Instalar Decorazon» lo enseña', async () => {
    instalacion.estado = 'aviso'
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    await userEvent.click(screen.getByRole('button', { name: 'Instalar Decorazon' }))
    expect(instalacion.instalar).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('en iOS abre los pasos (Compartir → Añadir a pantalla de inicio) y «Entendido» los cierra', async () => {
    instalacion.estado = 'ios'
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    await userEvent.click(screen.getByRole('button', { name: 'Instalar Decorazon' }))
    expect(instalacion.instalar).not.toHaveBeenCalled()
    const dialogo = screen.getByRole('dialog')
    expect(dialogo).toHaveTextContent('Añadir a pantalla de inicio')
    await userEvent.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('BarraSuperior: los pasos de iOS no dan por hecho Safari', () => {
  it('hablan del botón Compartir del navegador y de «Añadir a pantalla de inicio»', async () => {
    instalacion.estado = 'ios'
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    await userEvent.click(screen.getByRole('button', { name: 'Instalar Decorazon' }))
    const dialogo = screen.getByRole('dialog')
    expect(dialogo).not.toHaveTextContent('Safari')
    expect(dialogo).toHaveTextContent('Compartir')
    expect(dialogo).toHaveTextContent('Añadir a pantalla de inicio')
    instalacion.estado = 'no'
  })
})

describe('BarraSuperior: «Recuperar la versión anterior» (M-21)', () => {
  const ID = '11111111-1111-1111-1111-111111111111'
  const doc = () => almacen.getState().documento!
  const fetchCopia = vi.fn<(p: Request) => Promise<Response>>()

  beforeEach(() => {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 'jwt', caducidad: new Date(Date.now() + 86_400_000).toISOString() }))
    reiniciarSesion()
    almacen.getState().abrirDelServidor(ID, 3, 'Cocina', doc())
    almacen.setState({ guardado: 'guardado' })
    fetchCopia.mockReset()
    sincronizacion.abrirDiseno.mockClear()
    sincronizacion.esperarGuardados.mockClear()
    vi.stubGlobal('fetch', fetchCopia)
  })
  afterEach(() => vi.unstubAllGlobals())

  const abrirOpcion = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    await userEvent.click(screen.getByRole('button', { name: 'Recuperar la versión anterior' }))
  }

  it('pregunta con la fecha de la copia y, al aceptar, la recupera con la versión abierta y abre lo recuperado', async () => {
    fetchCopia.mockResolvedValueOnce(respuesta(200, { nombre: 'Cocina', tipoEstancia: 'salon', fecha: '2026-11-06T18:30:00Z', version: 2, contenido: doc() }))
    fetchCopia.mockResolvedValueOnce(respuesta(200, { id: ID, nombre: 'Cocina', tipoEstancia: 'salon', fechaDeCreacion: 'x', fechaDeModificacion: 'x', version: 4, contenido: doc(), enlace: null }))
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    await abrirOpcion()
    const dialogo = await screen.findByRole('dialog')
    expect(dialogo).toHaveTextContent('6 nov 2026')
    await userEvent.click(screen.getByRole('button', { name: 'Recuperar' }))
    await vi.waitFor(() => expect(sincronizacion.abrirDiseno).toHaveBeenCalledOnce())
    expect(sincronizacion.esperarGuardados).toHaveBeenCalledWith(ID)
    const post = fetchCopia.mock.calls[1]![0]
    expect(`${post.method} ${new URL(post.url).pathname}`).toBe(`POST /disenos/${ID}/version-anterior/recuperar`)
    expect(post.headers.get('If-Match')).toBe('"3"')
    expect(sincronizacion.abrirDiseno.mock.calls[0]![1]).toMatchObject({ id: ID, version: 4, pendiente: false, guardado: 'guardado' })
  })

  it('sin copia lo dice y no pregunta nada', async () => {
    fetchCopia.mockResolvedValueOnce(respuesta(404, { mensaje: 'No encontrado.' }))
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    await abrirOpcion()
    await vi.waitFor(() => expect(almacen.getState().aviso).toBe(textos.barra.sinVersionAnterior))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('con cambios sin guardar, la opción está desactivada; en un diseño sin cuenta no existe', async () => {
    almacen.setState({ guardado: 'pendiente' })
    const { unmount } = render(<BarraSuperior />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    expect(screen.getByRole('button', { name: 'Recuperar la versión anterior' })).toBeDisabled()
    unmount()
    reiniciarAlmacen()
    almacen.getState().crear('salon', 400, 330, 250)
    render(<BarraSuperior />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }))
    expect(screen.queryByRole('button', { name: 'Recuperar la versión anterior' })).toBeNull()
  })
})
