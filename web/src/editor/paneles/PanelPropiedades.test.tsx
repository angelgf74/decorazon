// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { anadirElemento, bloquearElemento, catalogoBase, longitudPared, type Abertura } from '../../nucleo'
import { textos } from '../../textos'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import PanelPropiedades from './PanelPropiedades'

const puerta: Abertura = { id: 'p', tipo: 'puerta', pared: 0, posicion: 50, ancho: 82, alto: 203, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' }

beforeEach(() => {
  reiniciarAlmacen()
  almacen.getState().crear('dormitorio', 400, 330, 250)
})

async function escribir(etiqueta: string, valor: string) {
  const campo = screen.getByLabelText(etiqueta)
  await userEvent.clear(campo)
  await userEvent.type(campo, `${valor}{Enter}`)
}

describe('PanelPropiedades en el paso 1', () => {
  it('una posición que saca la puerta de su pared se rechaza con aviso', async () => {
    almacen.getState().cambiar((d) => ({ ...d, aberturas: [puerta] }))
    almacen.getState().seleccionar({ tipo: 'abertura', id: 'p' })
    render(<PanelPropiedades />)
    await escribir('Posición', '390')
    expect(almacen.getState().documento!.aberturas[0]!.posicion).toBe(50)
    expect(almacen.getState().aviso).toBe(textos.edicion.noCabeEnPared)
    expect((screen.getByLabelText('Posición') as HTMLInputElement).value).toBe('50')
  })

  it('alarga la pared 0 y la parte en dos', async () => {
    almacen.getState().seleccionar({ tipo: 'pared', indice: 0 })
    render(<PanelPropiedades />)
    expect(screen.getByText('Pared 1')).toBeTruthy()
    await escribir('Longitud', '450')
    await userEvent.click(screen.getByRole('button', { name: 'Partir pared' }))
    const planta = almacen.getState().documento!.estancia.planta
    expect(planta).toHaveLength(5)
    expect(longitudPared(planta, 0)).toBe(225)
  })

  it('"Quitar esquina" en el vértice 2 deja un triángulo', async () => {
    almacen.getState().seleccionar({ tipo: 'vertice', indice: 2 })
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: 'Quitar esquina' }))
    expect(almacen.getState().documento!.estancia.planta).toEqual([{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 0, y: 330 }])
  })

  it('"Quitar" borra la abertura seleccionada', async () => {
    almacen.getState().cambiar((d) => ({ ...d, aberturas: [puerta] }))
    almacen.getState().seleccionar({ tipo: 'abertura', id: 'p' })
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: 'Quitar' }))
    expect(almacen.getState().documento!.aberturas).toHaveLength(0)
    expect(almacen.getState().seleccion).toBeNull()
  })
})

function colocar(tipo: string): string {
  const r = anadirElemento(almacen.getState().documento!, catalogoBase, tipo, { x: 200, y: 165 })
  almacen.getState().cambiar(() => r.documento)
  almacen.getState().irAPaso(2)
  almacen.getState().seleccionar({ tipo: 'elemento', id: r.id })
  return r.id
}

describe('PanelPropiedades con un elemento', () => {
  const elemento = () => almacen.getState().documento!.elementos[0]!

  it('un ancho fuera de rango se ajusta al máximo del tipo', async () => {
    colocar('armario')
    render(<PanelPropiedades />)
    expect(screen.getByRole('heading', { name: 'Armario' })).toBeTruthy()
    await escribir('Ancho', '9999')
    expect(elemento().medidas.ancho).toBe(400)
  })

  it('con puertas correderas el armario no tiene zonas de apertura', async () => {
    colocar('armario')
    render(<PanelPropiedades />)
    await userEvent.selectOptions(screen.getByLabelText('Puertas'), 'correderas')
    expect(elemento().variantes.puertas).toBe('correderas')
    expect(catalogoBase.get('armario')!.zonasApertura(elemento())).toEqual([])
    expect((screen.getByRole('option', { name: 'Correderas' }) as HTMLOptionElement).selected).toBe(true)
  })

  it('"Duplicar" añade una copia y "Borrar" quita el elemento y la selección', async () => {
    colocar('armario')
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: 'Duplicar' }))
    expect(almacen.getState().documento!.elementos).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }))
    expect(almacen.getState().documento!.elementos).toHaveLength(1)
    act(() => almacen.getState().seleccionar({ tipo: 'elemento', id: elemento().id }))
    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }))
    expect(almacen.getState().documento!.elementos).toHaveLength(0)
    expect(almacen.getState().seleccion).toBeNull()
  })

  it('en 3D (solo seleccionar, editar y borrar) no hay "Giro" ni "Duplicar"; en 2D sí', () => {
    colocar('armario')
    act(() => almacen.getState().cambiarVista('3d'))
    render(<PanelPropiedades />)
    expect(screen.queryByLabelText('Giro')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Duplicar' })).toBeNull()
    expect(screen.getByLabelText('Ancho')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Borrar' })).toBeTruthy()
    act(() => almacen.getState().cambiarVista('2d'))
    expect(screen.getByLabelText('Giro')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Duplicar' })).toBeTruthy()
  })

  it('inodoro: al empotrar la cisterna desaparece el campo "Alto", que ya no cambia nada', async () => {
    colocar('inodoro')
    render(<PanelPropiedades />)
    expect(screen.getByLabelText('Alto')).toBeTruthy()
    await userEvent.selectOptions(screen.getByLabelText('Cisterna vista'), 'false')
    expect(screen.queryByLabelText('Alto')).toBeNull()
  })

  it('lavabo de menos de 1 m: "Senos" solo ofrece uno; al ensancharlo, también dos', async () => {
    colocar('lavabo')
    render(<PanelPropiedades />)
    const senos = () => [...(screen.getByLabelText('Senos') as HTMLSelectElement).options].map((o) => o.value)
    expect(senos()).toEqual(['1'])
    await escribir('Ancho', '120')
    expect(senos()).toEqual(['1', '2'])
  })

  it('solo los tipos con altura editable tienen el campo de altura desde el suelo', () => {
    colocar('armario')
    const { unmount } = render(<PanelPropiedades />)
    expect(screen.queryByLabelText('Altura desde el suelo')).toBeNull()
    unmount()
    colocar('cuadro')
    render(<PanelPropiedades />)
    expect(screen.getByLabelText('Altura desde el suelo')).toBeTruthy()
    expect(screen.getByText('0–210 cm')).toBeTruthy()
  })

  it('cada elección de color es un paso de deshacer', () => {
    colocar('armario')
    render(<PanelPropiedades />)
    const color = screen.getByLabelText('Cuerpo')
    const inicial = elemento().colores.cuerpo
    fireEvent.input(color, { target: { value: '#111111' } })
    fireEvent.input(color, { target: { value: '#222222' } })
    fireEvent.change(color)
    fireEvent.input(color, { target: { value: '#333333' } })
    fireEvent.blur(color)
    expect(elemento().colores.cuerpo).toBe('#333333')
    almacen.getState().deshacer()
    expect(elemento().colores.cuerpo).toBe('#222222')
    almacen.getState().deshacer()
    expect(elemento().colores.cuerpo).toBe(inicial)
  })
})

describe('PanelPropiedades: bloquear, voltear y nombre propio', () => {
  const elemento = () => almacen.getState().documento!.elementos[0]!

  it('«Bloquear» bloquea (pulsado y sin campo «Giro») y «Desbloquear» libera', async () => {
    colocar('armario')
    render(<PanelPropiedades />)
    expect(screen.getByLabelText('Giro')).toBeTruthy()
    const boton = screen.getByRole('button', { name: 'Bloquear' })
    expect(boton).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(boton)
    expect(elemento().bloqueado).toBe(true)
    expect(boton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByLabelText('Giro')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Desbloquear' }))
    expect('bloqueado' in elemento()).toBe(false)
    expect(screen.getByLabelText('Giro')).toBeTruthy()
  })

  it('«Voltear» cambia de lado la chaise de un sofá; un armario no lo tiene', async () => {
    colocar('sofa')
    render(<PanelPropiedades />)
    await userEvent.selectOptions(screen.getByLabelText('Chaise longue'), 'izquierda')
    await userEvent.click(screen.getByRole('button', { name: 'Voltear' }))
    expect(elemento().variantes.chaise).toBe('derecha')
    expect((screen.getByRole('option', { name: 'Derecha' }) as HTMLOptionElement).selected).toBe(true)
    act(() => almacen.getState().seleccionar(null))
    colocar('armario')
    expect(screen.queryByRole('button', { name: 'Voltear' })).toBeNull()
  })

  it('una variante que solo admite un valor no se enseña: «Lado» de la cama aparece con nido (dos lados) y cajones (tres)', async () => {
    colocar('cama')
    render(<PanelPropiedades />)
    const base = screen.getByLabelText('Base')
    expect(within(base).getAllByRole('option').map((o) => o.textContent)).toEqual(['Patas', 'Canapé', 'Cajones', 'Cama nido'])
    expect(screen.queryByLabelText('Lado')).toBeNull()
    await userEvent.selectOptions(base, 'nido')
    expect(elemento().variantes.base).toBe('nido')
    expect(within(screen.getByLabelText('Lado')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Izquierda', 'Derecha'])
    await userEvent.selectOptions(screen.getByLabelText('Base'), 'cajones')
    expect(within(screen.getByLabelText('Lado')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Izquierda', 'Derecha', 'Ambos'])
    // Con menos de 40 de alto solo caben las patas: la base tampoco se enseña.
    await escribir('Alto', '30')
    expect(screen.queryByLabelText('Base')).toBeNull()
    expect(screen.queryByLabelText('Lado')).toBeNull()
  })

  it('una zona con materiales a elegir lleva un selector junto al color: las patas de la mesa en metal, madera o lacado; el tablero no', async () => {
    colocar('mesa')
    render(<PanelPropiedades />)
    const material = screen.getByLabelText('Material de Patas')
    expect(within(material).getAllByRole('option').map((o) => o.textContent)).toEqual(['Metal', 'Madera', 'Lacado'])
    expect(screen.queryByLabelText('Material de Tablero')).toBeNull()
    await userEvent.selectOptions(material, 'madera')
    expect(elemento().materiales).toEqual({ patas: 'madera' })
    expect(screen.getByLabelText('Patas')).toBeTruthy()
  })

  it('«Voltear» en una puerta cambia la bisagra', async () => {
    almacen.getState().cambiar((d) => ({ ...d, aberturas: [puerta] }))
    almacen.getState().seleccionar({ tipo: 'abertura', id: 'p' })
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: 'Voltear' }))
    expect(almacen.getState().documento!.aberturas[0]).toMatchObject({ bisagra: 'derecha' })
  })

  it('el campo «Nombre» pone el nombre propio (con Enter o al salir), lo enseña el título y vacío lo quita', async () => {
    colocar('armario')
    render(<PanelPropiedades />)
    const campo = screen.getByLabelText('Nombre') as HTMLInputElement
    expect(campo.placeholder).toBe('Armario')
    expect(campo.maxLength).toBe(60)
    await userEvent.type(campo, '  Armario de Ana {Enter}')
    expect(elemento().nombre).toBe('Armario de Ana')
    expect(screen.getByRole('heading', { name: 'Armario de Ana' })).toBeTruthy()
    expect(screen.getByText('Armario')).toBeTruthy()
    await userEvent.clear(campo)
    await userEvent.type(campo, 'De Ana')
    await userEvent.tab()
    expect(elemento().nombre).toBe('De Ana')
    await userEvent.clear(campo)
    await userEvent.tab()
    expect('nombre' in elemento()).toBe(false)
    expect(screen.getByRole('heading', { name: 'Armario' })).toBeTruthy()
  })

  it('con nombre propio, un mueble de tienda sigue diciendo el producto en el subtítulo', () => {
    colocar('armario')
    almacen.getState().cambiar((d) => ({
      ...d,
      elementos: d.elementos.map((e) => ({ ...e, nombre: 'El de la entrada', origen: { tipo: 'tienda' as const, proveedor: 'IKEA', nombre: 'PAX' } })),
    }))
    render(<PanelPropiedades />)
    expect(screen.getByRole('heading', { name: 'El de la entrada' })).toBeTruthy()
    expect(screen.getByText(/PAX/)).toBeTruthy()
  })

  it('Escape en «Nombre» restaura lo que había sin tocar el diseño', async () => {
    colocar('armario')
    render(<PanelPropiedades />)
    const campo = screen.getByLabelText('Nombre') as HTMLInputElement
    await userEvent.type(campo, 'Otro{Escape}')
    expect(campo.value).toBe('')
    expect('nombre' in elemento()).toBe(false)
  })
})

describe('PanelPropiedades sin selección', () => {
  it('en el paso 1 explica qué pulsar, sin atajos', () => {
    render(<PanelPropiedades />)
    expect(screen.getByRole('heading', { name: textos.propiedades.nadaSeleccionado })).toBeInTheDocument()
    expect(screen.getByText(textos.propiedades.nada)).toBeInTheDocument()
    expect(screen.queryByText(textos.propiedades.atajos)).toBeNull()
  })

  it('en el paso 2 explica qué pulsar', () => {
    act(() => almacen.getState().irAPaso(2))
    render(<PanelPropiedades />)
    expect(screen.getByText(textos.propiedades.nadaElemento)).toBeInTheDocument()
    expect(screen.queryByText(textos.propiedades.atajos)).toBeNull()
  })
})

describe('PanelPropiedades: atajos de teclado al pie, plegados', () => {
  const atajos = () => screen.getByRole('region', { name: textos.propiedades.atajos })

  it('con una pared seleccionada enseña los de la estancia al desplegarlos', async () => {
    almacen.getState().seleccionar({ tipo: 'pared', indice: 0 })
    render(<PanelPropiedades />)
    expect(document.querySelector('details.atajos')).not.toHaveAttribute('open')
    await userEvent.click(screen.getByText(textos.propiedades.atajos))
    expect(within(atajos()).getByText(textos.propiedades.atajo.quitar)).toBeInTheDocument()
    expect(within(atajos()).getByText(textos.propiedades.atajo.mover)).toBeInTheDocument()
    expect(within(atajos()).queryByText(textos.propiedades.atajo.girar)).toBeNull()
  })

  it('con un mueble seleccionado añade girar y duplicar', async () => {
    almacen.getState().irAPaso(2)
    almacen.getState().cambiar((d) => anadirElemento(d, catalogoBase, 'cama', { x: 200, y: 165 }).documento)
    almacen.getState().seleccionar({ tipo: 'elemento', id: almacen.getState().documento!.elementos[0]!.id })
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByText(textos.propiedades.atajos))
    expect(within(atajos()).getByText(textos.propiedades.atajo.girar)).toBeInTheDocument()
    expect(within(atajos()).getByText(textos.propiedades.atajo.duplicar)).toBeInTheDocument()
  })

  it('"Quitar" se distingue como acción que borra', () => {
    almacen.getState().cambiar((d) => ({ ...d, aberturas: [puerta] }))
    almacen.getState().seleccionar({ tipo: 'abertura', id: 'p' })
    render(<PanelPropiedades />)
    expect(screen.getByRole('button', { name: 'Quitar' })).toHaveClass('peligro')
  })
})

describe('PanelPropiedades: atajos del teclado para recorrer el plano (M-28)', () => {
  it('con un mueble seleccionado, los atajos dicen que Tab recorre los muebles y selecciona el que tiene el foco', async () => {
    almacen.getState().irAPaso(2)
    almacen.getState().cambiar((d) => anadirElemento(d, catalogoBase, 'cama', { x: 200, y: 165 }).documento)
    almacen.getState().seleccionar({ tipo: 'elemento', id: almacen.getState().documento!.elementos[0]!.id })
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByText(textos.propiedades.atajos))
    const region = screen.getByRole('region', { name: textos.propiedades.atajos })
    expect(within(region).getByText('Recorrer los muebles del plano (cada uno se selecciona al llegar)')).toBeInTheDocument()
    expect(within(region).getByText('Tab')).toBeInTheDocument()
  })
})

describe('PanelPropiedades: varios muebles (M-02)', () => {
  const ids = () => almacen.getState().documento!.elementos.map((e) => e.id)
  beforeEach(() => {
    almacen.getState().irAPaso(2)
    almacen.getState().cambiar((d) => anadirElemento(anadirElemento(d, catalogoBase, 'mesa', { x: 200, y: 165 }).documento, catalogoBase, 'silla', { x: 200, y: 110 }).documento)
  })

  it('con dos seleccionados dice cuántos y cuáles; «Borrar los 2» los quita juntos', async () => {
    almacen.getState().seleccionar({ tipo: 'elementos', ids: ids() })
    render(<PanelPropiedades />)
    expect(screen.getByRole('heading', { name: '2 muebles seleccionados' })).toBeInTheDocument()
    expect(screen.getByText('Mesa')).toBeInTheDocument()
    expect(screen.getByText('Silla')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Borrar los 2' }))
    expect(almacen.getState().documento!.elementos).toHaveLength(0)
  })

  it('«Seleccionar varios» (para el móvil) activa el modo; en el grupo, «Terminar» lo quita sin soltar la selección', async () => {
    almacen.getState().seleccionar({ tipo: 'elemento', id: ids()[0]! })
    const { unmount } = render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: 'Seleccionar varios' }))
    expect(almacen.getState().variosActivo).toBe(true)
    unmount()
    almacen.getState().seleccionar({ tipo: 'elementos', ids: ids() })
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: 'Terminar de seleccionar' }))
    expect(almacen.getState().variosActivo).toBe(false)
    expect(almacen.getState().seleccion).toEqual({ tipo: 'elementos', ids: ids() })
  })

  it('los atajos dicen cómo añadir con Mayúsculas+clic y Ctrl+A', async () => {
    almacen.getState().seleccionar({ tipo: 'elementos', ids: ids() })
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByText(textos.propiedades.atajos))
    const region = screen.getByRole('region', { name: textos.propiedades.atajos })
    expect(within(region).getByText('Añadir o quitar de la selección')).toBeInTheDocument()
    expect(within(region).getByText('Seleccionar todos los muebles')).toBeInTheDocument()
  })
})

describe('PanelPropiedades: el modo y los bloqueados se ven (M-02, revisión)', () => {
  const ids = () => almacen.getState().documento!.elementos.map((e) => e.id)
  beforeEach(() => {
    almacen.getState().irAPaso(2)
    almacen.getState().cambiar((d) => anadirElemento(anadirElemento(d, catalogoBase, 'mesa', { x: 200, y: 165 }).documento, catalogoBase, 'silla', { x: 200, y: 110 }).documento)
  })

  it('con un mueble, «Seleccionar varios» es un interruptor: pulsado dice qué hacer y se puede apagar', async () => {
    almacen.getState().seleccionar({ tipo: 'elemento', id: ids()[0]! })
    render(<PanelPropiedades />)
    const boton = screen.getByRole('button', { name: 'Seleccionar varios' })
    expect(boton).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(boton)
    expect(boton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(textos.propiedades.variosNota)).toBeInTheDocument()
    await userEvent.click(boton)
    expect(almacen.getState().variosActivo).toBe(false)
  })

  it('un grupo con un bloqueado avisa de que no se mueve', () => {
    almacen.getState().cambiar((d) => bloquearElemento(d, ids()[0]!, true))
    almacen.getState().seleccionar({ tipo: 'elementos', ids: ids() })
    render(<PanelPropiedades />)
    expect(screen.getByText(textos.propiedades.grupoBloqueado)).toBeInTheDocument()
  })
})
