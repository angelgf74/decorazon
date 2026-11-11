// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { contienePunto } from '../../nucleo/geometria/poligono'
import { textos } from '../../textos'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import Lienzo from '../lienzo/Lienzo'
import { anadirTipo } from '../estado/elementos'
import { reiniciarCatalogoLocal } from './catalogoLocal'
import PanelCatalogo from './PanelCatalogo'

beforeEach(() => {
  reiniciarAlmacen()
  // Favoritos y recientes viven en localStorage (que jsdom comparte entre los tests del fichero) y en su respaldo en memoria.
  localStorage.clear()
  reiniciarCatalogoLocal()
})

describe('PanelCatalogo', () => {
  it('en una cocina, el primer grupo es "Para tu cocina" y contiene el módulo bajo', () => {
    almacen.getState().crear('cocina', 400, 330, 250)
    render(<PanelCatalogo />)
    const grupos = screen.getAllByRole('region')
    expect(grupos[0]).toBe(screen.getByRole('region', { name: 'Para tu cocina' }))
    expect(within(grupos[0]!).getByRole('button', { name: /^Módulo bajo/ })).toBeTruthy()
  })

  it('en un despacho, el primer grupo es "Para tu despacho" y contiene los escritorios y la silla de oficina', () => {
    almacen.getState().crear('despacho', 400, 330, 250)
    render(<PanelCatalogo />)
    const grupos = screen.getAllByRole('region')
    expect(grupos[0]).toBe(screen.getByRole('region', { name: 'Para tu despacho' }))
    for (const nombre of [/^Escritorio \d/, /^Escritorio en L/, /^Silla de oficina/]) {
      expect(within(grupos[0]!).getByRole('button', { name: nombre })).toBeTruthy()
    }
  })

  it('en un baño, el primer grupo es "Para tu baño" con los sanitarios, y el espejo va en la decoración', () => {
    almacen.getState().crear('bano', 250, 200, 250)
    render(<PanelCatalogo />)
    const grupos = screen.getAllByRole('region')
    expect(grupos[0]).toBe(screen.getByRole('region', { name: 'Para tu baño' }))
    for (const nombre of [/^Inodoro/, /^Bidé/, /^Lavabo/, /^Plato de ducha/, /^Bañera/, /^Lavadora/, /^Columna de baño/, /^Armario de espejo/]) {
      expect(within(grupos[0]!).getByRole('button', { name: nombre })).toBeTruthy()
    }
    expect(within(screen.getByRole('region', { name: 'Decoración' })).getByRole('button', { name: /^Espejo/ })).toBeTruthy()
  })

  it('pulsar "Armario" en "Otros muebles" lo añade en el centro y lo deja seleccionado', async () => {
    almacen.getState().crear('salon', 400, 330, 250)
    almacen.getState().irAPaso(2)
    render(<PanelCatalogo />)
    const otros = screen.getByRole('region', { name: 'Otros muebles' })
    const boton = within(otros).getByRole('button', { name: /^Armario(?! de espejo| esquinero)/ })
    expect(boton.getAttribute('draggable')).toBe('true')
    expect(boton.textContent).toContain('100 × 60 cm')
    await userEvent.click(boton)
    const { documento, seleccion } = almacen.getState()
    expect(documento!.elementos).toHaveLength(1)
    const armario = documento!.elementos[0]!
    expect(armario.tipo).toBe('armario')
    expect(seleccion).toEqual({ tipo: 'elemento', id: armario.id })
  })
})

describe('PanelCatalogo en una L', () => {
  it('pulsar un tipo lo añade dentro de la planta aunque el centro de la caja caiga fuera', async () => {
    const ele = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 150 }, { x: 150, y: 150 }, { x: 150, y: 400 }, { x: 0, y: 400 }]
    almacen.getState().crear('salon', 400, 400, 250)
    almacen.getState().cambiar((d) => ({ ...d, estancia: { ...d.estancia, planta: ele } }))
    almacen.getState().irAPaso(2)
    render(<PanelCatalogo />)
    await userEvent.click(within(screen.getByRole('region', { name: 'Otros muebles' })).getByRole('button', { name: /^Armario(?! de espejo| esquinero)/ }))
    const armario = almacen.getState().documento!.elementos[0]!
    expect(contienePunto(ele, armario.posicion)).toBe(true)
  })

  it('los chips dejan un solo grupo a la vista; volver a pulsarlo enseña todos', async () => {
    almacen.getState().crear('dormitorio', 400, 330, 250)
    render(<PanelCatalogo />)
    const chips = within(screen.getByRole('group', { name: textos.catalogo.grupos })).getAllByRole('button')
    expect(chips.map((c) => c.textContent)).toEqual(['Para tu dormitorio', 'Decoración', 'Otros muebles'])
    expect(chips.every((c) => c.getAttribute('aria-pressed') === 'false')).toBe(true)
    expect(screen.getAllByRole('region')).toHaveLength(3)

    await userEvent.click(chips[1]!)
    expect(chips[1]).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('region')).toHaveLength(1)
    expect(screen.getByRole('region', { name: 'Decoración' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Armario(?! de espejo| esquinero)/ })).toBeNull()

    await userEvent.click(chips[1]!)
    expect(chips[1]).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getAllByRole('region')).toHaveLength(3)
  })

  it('el buscador filtra dentro del grupo elegido', async () => {
    almacen.getState().crear('dormitorio', 400, 330, 250)
    render(<PanelCatalogo />)
    await userEvent.click(screen.getByRole('button', { name: 'Otros muebles' }))
    await userEvent.type(screen.getByRole('searchbox', { name: textos.catalogo.buscar }), 'lampara')
    expect(screen.getByText(textos.catalogo.sinResultados)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Otros muebles' }))
    expect(screen.getByRole('button', { name: /^Lámpara de pie/ })).toBeInTheDocument()
  })

  it('el buscador filtra sin distinguir mayúsculas ni tildes', async () => {
    almacen.getState().crear('dormitorio', 400, 330, 250)
    render(<PanelCatalogo />)
    await userEvent.type(screen.getByRole('searchbox', { name: textos.catalogo.buscar }), 'LAMPARA')
    expect(screen.getByRole('button', { name: /^Lámpara de pie/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Armario(?! de espejo| esquinero)/ })).toBeNull()
  })

  it('sin coincidencias lo dice y no deja grupos vacíos', async () => {
    almacen.getState().crear('dormitorio', 400, 330, 250)
    render(<PanelCatalogo />)
    await userEvent.type(screen.getByRole('searchbox', { name: textos.catalogo.buscar }), 'zzz')
    expect(screen.getByText(textos.catalogo.sinResultados)).toBeInTheDocument()
    expect(screen.queryAllByRole('region')).toHaveLength(0)
  })
})

describe('PanelCatalogo con el dedo', () => {
  const elementFromPointOriginal = document.elementFromPoint
  const dedo = { pointerType: 'touch', pointerId: 1 }
  const asaDe = (nombre: RegExp) => screen.getByRole('button', { name: nombre }).querySelector<HTMLElement>('.panel-catalogo__asa')!
  const fantasma = () => document.querySelector('.panel-catalogo__fantasma')

  beforeEach(() => {
    almacen.getState().crear('dormitorio', 400, 330, 250)
    almacen.getState().irAPaso(2)
  })

  afterEach(() => {
    document.elementFromPoint = elementFromPointOriginal
  })

  it('arrastrar con el dedo desde el asa y soltar en el plano añade el mueble ahí', () => {
    const { container } = render(<><PanelCatalogo /><Lienzo /></>)
    const svg = container.querySelector('.lienzo__svg')!
    document.elementFromPoint = vi.fn(() => svg)
    const asa = asaDe(/^Armario(?! de espejo| esquinero)/)
    fireEvent.pointerDown(asa, { ...dedo, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(asa, { ...dedo, clientX: 90, clientY: 100 })
    expect(fantasma()?.textContent).toBe('Armario')
    fireEvent.pointerUp(asa, { ...dedo, clientX: 120, clientY: 140 })
    // El clic que el navegador genera tras soltar no añade otro en el centro.
    fireEvent.click(asa)
    expect(document.elementFromPoint).toHaveBeenCalledWith(120, 140)
    expect(fantasma()).toBeNull()
    const { documento, seleccion } = almacen.getState()
    expect(documento!.elementos).toHaveLength(1)
    const armario = documento!.elementos[0]!
    expect(armario.tipo).toBe('armario')
    expect(armario.posicion).toEqual({ x: 120, y: 140 })
    expect(seleccion).toEqual({ tipo: 'elemento', id: armario.id })
  })

  it('soltar fuera del plano no añade nada ni dispara el clic', () => {
    const { container } = render(<><PanelCatalogo /><Lienzo /></>)
    document.elementFromPoint = vi.fn(() => container.querySelector('.panel-catalogo__buscar'))
    const asa = asaDe(/^Armario(?! de espejo| esquinero)/)
    fireEvent.pointerDown(asa, { ...dedo, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(asa, { ...dedo, clientX: 60, clientY: 80 })
    fireEvent.pointerUp(asa, { ...dedo, clientX: 60, clientY: 80 })
    fireEvent.click(asa)
    expect(fantasma()).toBeNull()
    expect(almacen.getState().documento!.elementos).toHaveLength(0)
  })

  it('empezar a arrastrar cierra la hoja', () => {
    const alEmpezar = vi.fn()
    const { container } = render(<><PanelCatalogo alEmpezarArrastre={alEmpezar} /><Lienzo /></>)
    document.elementFromPoint = vi.fn(() => container.querySelector('.lienzo__svg'))
    fireEvent.pointerDown(asaDe(/^Armario(?! de espejo| esquinero)/), { ...dedo, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(asaDe(/^Armario(?! de espejo| esquinero)/), { ...dedo, clientX: 70, clientY: 70 })
    expect(alEmpezar).toHaveBeenCalledTimes(1)
    // Si el sistema cancela el toque, el arrastre acaba sin añadir nada.
    fireEvent.pointerCancel(asaDe(/^Armario(?! de espejo| esquinero)/), { ...dedo, clientX: 120, clientY: 140 })
    expect(fantasma()).toBeNull()
    expect(almacen.getState().documento!.elementos).toHaveLength(0)
  })

  it('un toque en el asa sin moverse no cierra la hoja ni añade nada', () => {
    const alEmpezar = vi.fn()
    const { container } = render(<><PanelCatalogo alEmpezarArrastre={alEmpezar} /><Lienzo /></>)
    document.elementFromPoint = vi.fn(() => container.querySelector('.lienzo__svg'))
    const asa = asaDe(/^Armario(?! de espejo| esquinero)/)
    fireEvent.pointerDown(asa, { ...dedo, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(asa, { ...dedo, clientX: 51, clientY: 51 })
    expect(fantasma()).toBeNull()
    fireEvent.pointerUp(asa, { ...dedo, clientX: 51, clientY: 51 })
    fireEvent.click(asa)
    expect(alEmpezar).not.toHaveBeenCalled()
    expect(almacen.getState().documento!.elementos).toHaveLength(0)
  })

  it('un arrastre abandonado (sin pointerup) se descarta en la siguiente pulsación del mismo puntero: no suelta nada', () => {
    const { container } = render(<><PanelCatalogo /><Lienzo /></>)
    const svg = container.querySelector('.lienzo__svg')!
    document.elementFromPoint = vi.fn(() => svg)
    const asa = asaDe(/^Armario(?! de espejo| esquinero)/)
    fireEvent.pointerDown(asa, { ...dedo, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(asa, { ...dedo, clientX: 90, clientY: 100 })
    // El pointerup se perdió. La siguiente pulsación con el mismo id es otra cosa (aquí, en el vacío del plano).
    fireEvent.pointerDown(svg, { pointerType: 'mouse', pointerId: 1, clientX: 120, clientY: 140 })
    fireEvent.pointerUp(svg, { pointerType: 'mouse', pointerId: 1, clientX: 120, clientY: 140 })
    expect(fantasma()).toBeNull()
    expect(almacen.getState().documento!.elementos).toHaveLength(0)
  })

  it('también si la pulsación siguiente es en otra asa (que para la propagación): solo cae el mueble nuevo', () => {
    const { container } = render(<><PanelCatalogo /><Lienzo /></>)
    const svg = container.querySelector('.lienzo__svg')!
    document.elementFromPoint = vi.fn(() => svg)
    const raton = { pointerType: 'mouse', pointerId: 1 }
    fireEvent.pointerDown(asaDe(/^Armario(?! de espejo| esquinero)/), { ...raton, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(asaDe(/^Armario(?! de espejo| esquinero)/), { ...raton, clientX: 90, clientY: 100 })
    // Se pierde el pointerup; se arrastra otro tipo con el mismo puntero.
    const asa = asaDe(/^Cama/)
    fireEvent.pointerDown(asa, { ...raton, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(asa, { ...raton, clientX: 90, clientY: 100 })
    fireEvent.pointerUp(asa, { ...raton, clientX: 150, clientY: 160 })
    const elementos = almacen.getState().documento!.elementos
    expect(elementos.map((e) => e.tipo)).toEqual([expect.stringMatching(/^cama/)])
  })

  it('si el catálogo se desmonta a mitad del arrastre, soltar luego en el plano no añade nada', () => {
    const { container, rerender } = render(<><PanelCatalogo /><Lienzo /></>)
    document.elementFromPoint = vi.fn(() => container.querySelector('.lienzo__svg'))
    const asa = asaDe(/^Armario(?! de espejo| esquinero)/)
    fireEvent.pointerDown(asa, { ...dedo, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(asa, { ...dedo, clientX: 90, clientY: 100 })
    rerender(<><Lienzo /></>)
    expect(fantasma()).toBeNull()
    fireEvent.pointerUp(window, { ...dedo, clientX: 120, clientY: 140 })
    expect(almacen.getState().documento!.elementos).toHaveLength(0)
  })
})

describe('PanelCatalogo: miniaturas, favoritos y usados hace poco', () => {
  const armario = /^Armario(?! de espejo| esquinero)/
  const region = (nombre: string) => screen.getByRole('region', { name: nombre })
  const chips = () => within(screen.getByRole('group', { name: textos.catalogo.grupos })).getAllByRole('button').map((c) => c.textContent)
  // Los recientes se ponen al día cuando el puntero sale del panel (userEvent.click lo deja dentro).
  const salir = () => fireEvent.pointerLeave(document.querySelector('.panel-catalogo')!)
  const estrellaDe = (grupo: string, nombre: string) =>
    within(region(grupo)).getByRole('button', { name: textos.catalogo.marcarFavorito(nombre) })

  beforeEach(() => {
    // En un salón, el armario y los demás que se usan aquí van en «Otros muebles».
    almacen.getState().crear('salon', 400, 330, 250)
    almacen.getState().irAPaso(2)
  })

  it('cada tarjeta lleva la miniatura 3D del tipo y conserva su nombre accesible', () => {
    render(<PanelCatalogo />)
    const tarjetas = document.querySelectorAll('.panel-catalogo__tipo')
    expect(tarjetas.length).toBeGreaterThan(10)
    for (const t of tarjetas) expect(t.querySelector('img.panel-catalogo__miniatura')).not.toBeNull()
    expect(screen.getByRole('button', { name: armario }).textContent).toContain('100 × 60 cm')
  })

  it('la estrella de "Armario" crea el grupo "Favoritos" con esa tarjeta, marcada; volver a pulsarla lo quita', async () => {
    render(<PanelCatalogo />)
    expect(screen.queryByRole('region', { name: textos.catalogo.favoritos })).toBeNull()
    const estrella = estrellaDe('Otros muebles', 'Armario')
    expect(estrella).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(estrella)
    expect(estrella).toHaveAttribute('aria-pressed', 'true')
    const favoritos = region(textos.catalogo.favoritos)
    expect(screen.getAllByRole('region')[0]).toBe(favoritos)
    expect(within(favoritos).getByRole('button', { name: armario })).toBeInTheDocument()
    expect(within(favoritos).getByRole('button', { name: textos.catalogo.marcarFavorito('Armario') })).toHaveAttribute('aria-pressed', 'true')
    expect(chips()[0]).toBe(textos.catalogo.favoritos)
    // La estrella no añade el mueble al plano.
    expect(almacen.getState().documento!.elementos).toHaveLength(0)
    expect(JSON.parse(localStorage.getItem('decorazon.catalogo.favoritos')!)).toEqual(['armario'])

    await userEvent.click(estrella)
    expect(estrella).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('region', { name: textos.catalogo.favoritos })).toBeNull()
    expect(chips()).toEqual(['Para tu salón', 'Decoración', 'Otros muebles'])
  })

  it('los favoritos se recuerdan entre visitas', () => {
    localStorage.setItem('decorazon.catalogo.favoritos', JSON.stringify(['cama', 'armario']))
    render(<PanelCatalogo />)
    const favoritos = region(textos.catalogo.favoritos)
    expect(within(favoritos).getAllByRole('button').filter((b) => b.classList.contains('panel-catalogo__tipo'))).toHaveLength(2)
  })

  it('añadir un tipo lo pone en "Usados hace poco", el más reciente primero y como mucho seis', async () => {
    render(<PanelCatalogo />)
    expect(screen.queryByRole('region', { name: textos.catalogo.recientes })).toBeNull()
    await userEvent.click(within(region('Otros muebles')).getByRole('button', { name: armario }))
    salir()
    let recientes = region(textos.catalogo.recientes)
    expect(within(recientes).getByRole('button', { name: armario })).toBeInTheDocument()
    expect(chips()).toContain(textos.catalogo.recientes)

    const otros = region('Otros muebles')
    for (const nombre of [/^Archivador/, /^Cama/, /^Cajonera/, /^Escritorio en L/, /^Inodoro/, /^Lavabo/]) {
      await userEvent.click(within(otros).getByRole('button', { name: nombre }))
    }
    salir()
    recientes = region(textos.catalogo.recientes)
    const nombres = within(recientes).getAllByRole('button').filter((b) => b.classList.contains('panel-catalogo__tipo')).map((b) => b.querySelector('.panel-catalogo__nombre')!.textContent)
    expect(nombres).toHaveLength(6)
    expect(nombres[0]).toBe('Lavabo')
    expect(nombres).not.toContain('Armario')
    expect(JSON.parse(localStorage.getItem('decorazon.catalogo.recientes')!)).toHaveLength(6)
  })

  it('volver a añadir un tipo lo sube al principio sin repetirlo', async () => {
    render(<PanelCatalogo />)
    const otros = region('Otros muebles')
    await userEvent.click(within(otros).getByRole('button', { name: armario }))
    await userEvent.click(within(otros).getByRole('button', { name: /^Cama/ }))
    await userEvent.click(within(otros).getByRole('button', { name: armario }))
    salir()
    const nombres = within(region(textos.catalogo.recientes)).getAllByRole('button').filter((b) => b.classList.contains('panel-catalogo__tipo')).map((b) => b.querySelector('.panel-catalogo__nombre')!.textContent)
    expect(nombres).toEqual(['Armario', 'Cama'])
  })

  it('el buscador filtra también dentro de favoritos y recientes', async () => {
    localStorage.setItem('decorazon.catalogo.favoritos', JSON.stringify(['cama', 'armario']))
    render(<PanelCatalogo />)
    await userEvent.type(screen.getByRole('searchbox', { name: textos.catalogo.buscar }), 'arma')
    const favoritos = region(textos.catalogo.favoritos)
    expect(within(favoritos).getByRole('button', { name: armario })).toBeInTheDocument()
    expect(within(favoritos).queryByRole('button', { name: /^Cama/ })).toBeNull()
  })

  it('un favorito que ya no existe en el catálogo se ignora', () => {
    localStorage.setItem('decorazon.catalogo.favoritos', JSON.stringify(['tipo-que-no-existe']))
    render(<PanelCatalogo />)
    expect(screen.queryByRole('region', { name: textos.catalogo.favoritos })).toBeNull()
  })

  it('con un localStorage que lanza, el catálogo se pinta igual, sin esos grupos, y la estrella sigue funcionando en la pestaña', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado') })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado') })
    try {
      render(<PanelCatalogo />)
      expect(chips()).toEqual(['Para tu salón', 'Decoración', 'Otros muebles'])
      await userEvent.click(estrellaDe('Otros muebles', 'Armario'))
      expect(within(region(textos.catalogo.favoritos)).getByRole('button', { name: armario })).toBeInTheDocument()
    } finally {
      getItem.mockRestore()
      setItem.mockRestore()
    }
  })
})

describe('PanelCatalogo: lo que salió en la revisión', () => {
  const armario = /^Armario(?! de espejo| esquinero)/
  const region = (nombre: string) => screen.getByRole('region', { name: nombre })
  const estrellaDe = (grupo: string, nombre: string) =>
    within(region(grupo)).getByRole('button', { name: textos.catalogo.marcarFavorito(nombre) })
  const salirDelPanel = () => fireEvent.pointerLeave(document.querySelector('.panel-catalogo')!)

  beforeEach(() => {
    reiniciarCatalogoLocal()
    almacen.getState().crear('salon', 400, 330, 250)
    almacen.getState().irAPaso(2)
  })

  it('con localStorage lleno (solo setItem lanza), la estrella y los recientes siguen funcionando en la pestaña', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError') })
    try {
      render(<PanelCatalogo />)
      await userEvent.click(estrellaDe('Otros muebles', 'Armario'))
      expect(estrellaDe('Otros muebles', 'Armario')).toHaveAttribute('aria-pressed', 'true')
      expect(within(region(textos.catalogo.favoritos)).getByRole('button', { name: armario })).toBeInTheDocument()
      await userEvent.click(within(region('Otros muebles')).getByRole('button', { name: /^Cama/ }))
      salirDelPanel()
      expect(within(region(textos.catalogo.recientes)).getByRole('button', { name: /^Cama/ })).toBeInTheDocument()
    } finally {
      setItem.mockRestore()
    }
  })

  it('con el chip "Favoritos" pulsado, quitar el último favorito vuelve a enseñar todos los grupos sin ningún chip pulsado', async () => {
    render(<PanelCatalogo />)
    await userEvent.click(estrellaDe('Otros muebles', 'Armario'))
    await userEvent.click(screen.getByRole('button', { name: textos.catalogo.favoritos }))
    expect(screen.getAllByRole('region')).toHaveLength(1)
    await userEvent.click(estrellaDe(textos.catalogo.favoritos, 'Armario'))
    expect(screen.getAllByRole('region')).toHaveLength(3)
    expect(screen.queryByText(textos.catalogo.sinResultados)).toBeNull()
    const chips = within(screen.getByRole('group', { name: textos.catalogo.grupos })).getAllByRole('button')
    expect(chips.every((c) => c.getAttribute('aria-pressed') === 'false')).toBe(true)
  })

  it('"Usados hace poco" no cambia mientras el puntero está en el panel: la lista no salta bajo el puntero', async () => {
    render(<PanelCatalogo />)
    const otros = region('Otros muebles')
    await userEvent.click(within(otros).getByRole('button', { name: armario }))
    expect(screen.queryByRole('region', { name: textos.catalogo.recientes })).toBeNull()
    await userEvent.click(within(otros).getByRole('button', { name: /^Cama/ }))
    expect(screen.queryByRole('region', { name: textos.catalogo.recientes })).toBeNull()
    salirDelPanel()
    const nombres = within(region(textos.catalogo.recientes)).getAllByRole('button').filter((b) => b.classList.contains('panel-catalogo__tipo')).map((b) => b.querySelector('.panel-catalogo__nombre')!.textContent)
    expect(nombres).toEqual(['Cama', 'Armario'])
  })

  it('un cambio de recientes que llega sin el puntero en el panel (soltar en el plano) se enseña al momento', () => {
    render(<PanelCatalogo />)
    act(() => anadirTipo('armario', { x: 100, y: 100 }))
    expect(within(region(textos.catalogo.recientes)).getByRole('button', { name: armario })).toBeInTheDocument()
  })

  it('al quitar un favorito desde "Favoritos", el foco va al siguiente del grupo o, si era el último, a su estrella de siempre', async () => {
    render(<PanelCatalogo />)
    await userEvent.click(estrellaDe('Otros muebles', 'Armario'))
    await userEvent.click(estrellaDe('Otros muebles', 'Cama'))
    const primera = estrellaDe(textos.catalogo.favoritos, 'Armario')
    primera.focus()
    await userEvent.keyboard('{Enter}')
    expect(document.activeElement).toBe(estrellaDe(textos.catalogo.favoritos, 'Cama'))
    await userEvent.keyboard('{Enter}')
    expect(screen.queryByRole('region', { name: textos.catalogo.favoritos })).toBeNull()
    expect(document.activeElement).toBe(estrellaDe('Otros muebles', 'Cama'))
  })
})
