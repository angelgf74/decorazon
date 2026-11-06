// @vitest-environment jsdom
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { anadirElemento, catalogoBase, type Abertura, type DocumentoDiseno } from '../../nucleo'
import { textos } from '../../textos'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import { conflictosDe } from '../estado/conflictos'
import AvisosDelPlano from './AvisosDelPlano'

const puerta: Abertura = { id: 'p', tipo: 'puerta', pared: 0, posicion: 20, ancho: 80, alto: 210, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' }

function poner(doc: DocumentoDiseno, tipo: string, x: number, y: number): DocumentoDiseno {
  return anadirElemento(doc, catalogoBase, tipo, { x, y }).documento
}

/** Dos camas en el mismo sitio: un solape (error) y un paso estrecho (aviso). */
function dosCamas(): DocumentoDiseno {
  let doc = almacen.getState().documento!
  doc = poner(doc, 'cama', 100, 200)
  doc = poner(doc, 'cama', 100, 200)
  almacen.getState().cambiar(() => doc)
  return doc
}

const chip = () => screen.getByRole('button', { name: /avisos?$/ })
const lista = () => screen.getByRole('region', { name: textos.avisos.titulo })

beforeEach(() => {
  reiniciarAlmacen()
  almacen.getState().crear('dormitorio', 400, 330, 250)
})

describe('AvisosDelPlano', () => {
  it('sin conflictos es un estado verde, no un botón', () => {
    render(<AvisosDelPlano />)
    expect(screen.getByText('Todo cabe y se abre')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('con conflictos el chip dice cuántos y, al abrirlo, el solape va antes que el paso estrecho', async () => {
    const doc = dosCamas()
    const gravedades = conflictosDe(doc).map((c) => c.gravedad)
    expect(gravedades).toContain('error')
    expect(gravedades).toContain('aviso')
    render(<AvisosDelPlano />)
    expect(chip()).toHaveTextContent(textos.barra.avisos(gravedades.length))
    expect(chip()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('region', { name: textos.avisos.titulo })).toBeNull()

    await userEvent.click(chip())
    expect(chip()).toHaveAttribute('aria-expanded', 'true')
    const botones = within(lista()).getAllByRole('button')
    expect(botones[0]!.textContent).toContain('se solapan')
    expect(botones[botones.length - 1]!.textContent).toContain('Paso estrecho')
    expect(botones).toHaveLength(gravedades.length)
  })

  it('elegir el aviso de una puerta va al paso 1, la selecciona y cierra la lista', async () => {
    let doc: DocumentoDiseno = { ...almacen.getState().documento!, aberturas: [puerta] }
    doc = poner(doc, 'armario', 60, 40)
    const c = conflictosDe(doc).find((x) => x.ids[0] === 'p')
    expect(c).toBeTruthy()
    almacen.getState().cambiar(() => doc)
    almacen.getState().irAPaso(2)
    render(<AvisosDelPlano />)
    await userEvent.click(chip())
    await userEvent.click(within(lista()).getByRole('button', { name: c!.mensaje }))
    expect(almacen.getState().paso).toBe(1)
    expect(almacen.getState().seleccion).toEqual({ tipo: 'abertura', id: 'p' })
    expect(screen.queryByRole('region', { name: textos.avisos.titulo })).toBeNull()
  })

  it('elegir el aviso de un mueble va al paso 2 y lo selecciona', async () => {
    const doc = dosCamas()
    almacen.getState().irAPaso(1)
    render(<AvisosDelPlano />)
    await userEvent.click(chip())
    await userEvent.click(within(lista()).getAllByRole('button')[0]!)
    expect(almacen.getState().paso).toBe(2)
    expect(almacen.getState().seleccion).toEqual({ tipo: 'elemento', id: doc.elementos[0]!.id })
  })

  it('Escape cierra la lista y devuelve el foco al chip; pulsar fuera también la cierra', async () => {
    dosCamas()
    render(<><AvisosDelPlano /><button type="button">fuera</button></>)
    await userEvent.click(chip())
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: textos.avisos.titulo })).toBeNull()
    expect(chip()).toHaveFocus()
    await userEvent.click(chip())
    await userEvent.click(screen.getByRole('button', { name: 'fuera' }))
    expect(screen.queryByRole('region', { name: textos.avisos.titulo })).toBeNull()
  })

  it('si los conflictos desaparecen con la lista abierta, vuelve el estado verde', async () => {
    dosCamas()
    render(<AvisosDelPlano />)
    await userEvent.click(chip())
    act(() => almacen.getState().deshacer())
    expect(screen.getByText('Todo cabe y se abre')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: textos.avisos.titulo })).toBeNull()
  })
})

describe('AvisosDelPlano: anuncio al lector de pantalla', () => {
  const anuncio = () => document.querySelector('.solo-lectores[aria-live="polite"]')

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('hay una región aria-live oculta, sin role="status", que empieza vacía', () => {
    render(<AvisosDelPlano />)
    expect(anuncio()).not.toBeNull()
    expect(anuncio()).not.toHaveAttribute('role')
    expect(anuncio()).toHaveTextContent('')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('anuncia cuántos avisos hay pasados 600 ms, y no antes; al volver a cero, que todo cabe', () => {
    render(<AvisosDelPlano />)
    act(() => { dosCamas() })
    const n = conflictosDe(almacen.getState().documento!).length
    act(() => { vi.advanceTimersByTime(500) })
    expect(anuncio()).toHaveTextContent('')
    act(() => { vi.advanceTimersByTime(100) })
    expect(anuncio()).toHaveTextContent(textos.barra.avisos(n))
    act(() => almacen.getState().deshacer())
    act(() => { vi.advanceTimersByTime(600) })
    expect(anuncio()).toHaveTextContent(textos.avisos.todoBien)
  })

  it('el mismo número de avisos no se vuelve a anunciar; un arrastre con cambios seguidos solo anuncia el final', () => {
    render(<AvisosDelPlano />)
    act(() => { dosCamas() })
    act(() => { vi.advanceTimersByTime(600) })
    const texto = anuncio()!.textContent
    // Mover una cama 1 cm deja los mismos conflictos: el anuncio no cambia (ni se vacía y repinta).
    act(() => almacen.getState().cambiar((d) => ({ ...d, elementos: d.elementos.map((e, i) => (i === 0 ? { ...e, posicion: { x: e.posicion.x + 1, y: e.posicion.y } } : e)) })))
    act(() => { vi.advanceTimersByTime(600) })
    expect(anuncio()!.textContent).toBe(texto)
    // Varios cambios dentro de los 600 ms: un solo anuncio, el último.
    act(() => almacen.getState().deshacer())
    act(() => { vi.advanceTimersByTime(300) })
    act(() => almacen.getState().rehacer())
    act(() => { vi.advanceTimersByTime(600) })
    expect(anuncio()!.textContent).toBe(texto)
  })
})
