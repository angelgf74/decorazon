// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { anadirElemento, catalogoBase, vincularTienda, type OrigenTienda } from '../../nucleo'
import { textos } from '../../textos'
import { hoy } from '../comunes/formatos'
import { almacen, reiniciarAlmacen } from '../estado/almacen'
import PanelPropiedades from './PanelPropiedades'

const t = textos.tienda
let id = ''

beforeEach(() => {
  reiniciarAlmacen()
  almacen.getState().crear('dormitorio', 400, 330, 250)
  almacen.getState().irAPaso(2)
  almacen.getState().cambiar((d) => {
    const r = anadirElemento(d, catalogoBase, 'armario', { x: 200, y: 165 })
    id = r.id
    return r.documento
  })
  almacen.getState().seleccionar({ tipo: 'elemento', id })
})

const elemento = () => almacen.getState().documento!.elementos[0]!

async function rellenar(etiqueta: string, valor: string) {
  const campo = screen.getByLabelText(etiqueta)
  await userEvent.clear(campo)
  if (valor) await userEvent.type(campo, valor)
}

function vincular(origen: OrigenTienda, medidas = { ancho: 100, fondo: 58, alto: 201 }) {
  almacen.getState().cambiar((d) => vincularTienda(d, catalogoBase, id, origen, medidas))
}

describe('ProductoDeTienda', () => {
  it('«Es de una tienda» abre el formulario con las medidas del mueble; guardar lo vincula en un solo paso de deshacer', async () => {
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.esDeTienda }))
    expect((screen.getByLabelText(t.campos.ancho) as HTMLInputElement).value).toBe(String(elemento().medidas.ancho))
    await rellenar(t.campos.proveedor, 'IKEA')
    await rellenar(t.campos.nombre, 'PAX')
    await rellenar(t.campos.referencia, '805.483.84')
    await rellenar(t.campos.url, 'www.ikea.com/es/es/p/pax-80548384/?utm_source=x')
    await rellenar(t.campos.precio, '199,99')
    await rellenar(t.campos.ancho, '100')
    await rellenar(t.campos.fondo, '58')
    await rellenar(t.campos.alto, '201')
    await userEvent.click(screen.getByRole('button', { name: t.guardar }))

    expect(elemento().origen).toEqual({
      tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX', referencia: '805.483.84',
      url: 'https://www.ikea.com/es/es/p/pax-80548384/', precio: 199.99, fechaPrecio: hoy(),
    })
    expect(elemento().medidas).toEqual({ ancho: 100, fondo: 58, alto: 201 })
    expect(screen.getByRole('heading', { name: 'PAX' })).toBeInTheDocument()
    almacen.getState().deshacer()
    expect(elemento().origen).toEqual({ tipo: 'generico' })
  })

  it('sin tienda ni nombre, o con una dirección que no es web, no guarda y lo dice en cada campo', async () => {
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.esDeTienda }))
    await rellenar(t.campos.url, 'javascript:alert(1)')
    await rellenar(t.campos.precio, '12,345')
    await userEvent.click(screen.getByRole('button', { name: t.guardar }))
    expect(elemento().origen).toEqual({ tipo: 'generico' })
    expect(screen.getByLabelText(t.campos.proveedor)).toHaveAccessibleDescription(t.errores.proveedor)
    expect(screen.getByLabelText(t.campos.nombre)).toHaveAccessibleDescription(t.errores.nombre)
    expect(screen.getByLabelText(t.campos.url)).toHaveAccessibleDescription(t.errores.url)
    expect(screen.getByLabelText(t.campos.precio)).toHaveAccessibleDescription(t.errores.precio)
    expect(screen.getByLabelText(t.campos.proveedor)).toHaveFocus()
  })

  it('una medida fuera del rango del tipo no se recorta en silencio: se avisa y no se guarda', async () => {
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.esDeTienda }))
    await rellenar(t.campos.proveedor, 'IKEA')
    await rellenar(t.campos.nombre, 'PAX')
    await rellenar(t.campos.ancho, '500')
    await userEvent.click(screen.getByRole('button', { name: t.guardar }))
    expect(elemento().origen).toEqual({ tipo: 'generico' })
    expect(screen.getByLabelText(t.campos.ancho)).toHaveAccessibleDescription(t.errores.medida(40, 400))
  })

  it('al escribir el precio se pone la fecha de hoy, y se puede corregir', async () => {
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.esDeTienda }))
    const fecha = screen.getByLabelText(t.campos.fechaPrecio) as HTMLInputElement
    expect(fecha.value).toBe('')
    await rellenar(t.campos.precio, '50')
    expect(fecha.value).toBe(hoy())
    await rellenar(t.campos.proveedor, 'IKEA')
    await rellenar(t.campos.nombre, 'MALM')
    await rellenar(t.campos.fechaPrecio, '2026-10-01')
    await userEvent.click(screen.getByRole('button', { name: t.guardar }))
    expect(elemento().origen).toMatchObject({ precio: 50, fechaPrecio: '2026-10-01' })
  })

  it('cancelar no cambia nada', async () => {
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.esDeTienda }))
    await rellenar(t.campos.proveedor, 'IKEA')
    await userEvent.click(screen.getByRole('button', { name: t.cancelar }))
    expect(elemento().origen).toEqual({ tipo: 'generico' })
    expect(screen.getByRole('button', { name: t.esDeTienda })).toBeInTheDocument()
  })

  it('vinculado: ficha de solo lectura, medidas sin campos, enlace seguro, nota de marcas y lo paramétrico sigue editable', () => {
    vincular({ tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX', referencia: '805.483.84', url: 'https://www.ikea.com/es/es/p/pax/', precio: 199, fechaPrecio: '2026-11-03' })
    render(<PanelPropiedades />)
    expect(screen.getByRole('heading', { name: 'PAX' })).toBeInTheDocument()
    expect(screen.getByText(t.deTienda('Armario', 'IKEA'))).toBeInTheDocument()
    const ficha = screen.getByRole('region', { name: t.titulo })
    expect(within(ficha).getByText('805.483.84')).toBeInTheDocument()
    expect(within(ficha).getByText(/199,00\s€ \(anotado el 03\/11\/2026\)/)).toBeInTheDocument()
    expect(within(ficha).getByText('100 × 58 × 201 cm')).toBeInTheDocument()
    const enlace = within(ficha).getByRole('link', { name: t.verEnTienda })
    expect(enlace).toHaveAttribute('href', 'https://www.ikea.com/es/es/p/pax/')
    expect(enlace).toHaveAttribute('target', '_blank')
    expect(enlace).toHaveAttribute('rel', 'noopener noreferrer nofollow')
    expect(screen.getByText(t.marcas)).toBeInTheDocument()
    expect(screen.queryByLabelText(textos.propiedades.ancho)).toBeNull()
    expect(screen.getByLabelText(textos.propiedades.giro)).toBeInTheDocument()
  })

  it('«Editar producto» abre el formulario con sus datos; «Desvincular» lo vuelve genérico con las mismas medidas', async () => {
    vincular({ tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX', precio: 199, fechaPrecio: '2026-11-03' })
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.editar }))
    expect((screen.getByLabelText(t.campos.nombre) as HTMLInputElement).value).toBe('PAX')
    expect((screen.getByLabelText(t.campos.precio) as HTMLInputElement).value).toBe('199')
    expect((screen.getByLabelText(t.campos.fechaPrecio) as HTMLInputElement).value).toBe('2026-11-03')
    await rellenar(t.campos.ancho, '150')
    await userEvent.click(screen.getByRole('button', { name: t.guardar }))
    expect(elemento().medidas.ancho).toBe(150)
    // Sin tocar el precio, la fecha se queda la que era.
    expect(elemento().origen).toMatchObject({ fechaPrecio: '2026-11-03' })

    await userEvent.click(screen.getByRole('button', { name: t.desvincular }))
    expect(elemento().origen).toEqual({ tipo: 'generico' })
    expect(elemento().medidas.ancho).toBe(150)
    expect(screen.getByLabelText(textos.propiedades.ancho)).toBeInTheDocument()
  })

  it('un precio borrado se guarda sin precio ni fecha', async () => {
    vincular({ tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX', precio: 199, fechaPrecio: '2026-11-03' })
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.editar }))
    await rellenar(t.campos.precio, '')
    await userEvent.click(screen.getByRole('button', { name: t.guardar }))
    expect(elemento().origen).toEqual({ tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX' })
  })

  it('al cambiar de mueble seleccionado se cierra el formulario', async () => {
    const { rerender } = render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.esDeTienda }))
    let otro = ''
    almacen.getState().cambiar((d) => {
      const r = anadirElemento(d, catalogoBase, 'cama', { x: 200, y: 250 })
      otro = r.id
      return r.documento
    })
    almacen.getState().seleccionar({ tipo: 'elemento', id: otro })
    rerender(<PanelPropiedades />)
    expect(screen.queryByLabelText(t.campos.proveedor)).toBeNull()
  })
})

describe('ProductoDeTienda: foco y medidas', () => {
  it('al abrir, el foco va a «Tienda»; al guardar, a «Editar producto»; al desvincular, a «Es de una tienda»; al cancelar, también', async () => {
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.esDeTienda }))
    expect(screen.getByLabelText(t.campos.proveedor)).toHaveFocus()
    await userEvent.type(screen.getByLabelText(t.campos.proveedor), 'IKEA')
    await rellenar(t.campos.nombre, 'PAX')
    await userEvent.click(screen.getByRole('button', { name: t.guardar }))
    expect(screen.getByRole('button', { name: t.editar })).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: t.desvincular }))
    expect(screen.getByRole('button', { name: t.esDeTienda })).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: t.esDeTienda }))
    await userEvent.click(screen.getByRole('button', { name: t.cancelar }))
    expect(screen.getByRole('button', { name: t.esDeTienda })).toHaveFocus()
  })

  it('al seleccionar un mueble de tienda, el foco no se mueve', () => {
    vincular({ tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX' })
    render(<PanelPropiedades />)
    expect(screen.getByRole('button', { name: t.editar })).not.toHaveFocus()
  })

  it('una medida con decimales lo dice; al corregir el campo, el error se va sin esperar a guardar', async () => {
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.esDeTienda }))
    await rellenar(t.campos.ancho, '100,5')
    await userEvent.click(screen.getByRole('button', { name: t.guardar }))
    expect(screen.getByLabelText(t.campos.ancho)).toHaveAccessibleDescription(t.errores.medidaEntera)
    await rellenar(t.campos.ancho, '100')
    expect(screen.getByLabelText(t.campos.ancho)).not.toHaveAccessibleDescription(t.errores.medidaEntera)
  })

  it('inodoro con la cisterna empotrada: no se pide el alto (es el de la taza) y la ficha enseña ese', async () => {
    let inodoro = ''
    almacen.getState().cambiar((d) => {
      const r = anadirElemento(d, catalogoBase, 'inodoro', { x: 100, y: 100 })
      inodoro = r.id
      return { ...r.documento, elementos: r.documento.elementos.map((x) => (x.id === inodoro ? { ...x, variantes: { ...x.variantes, cisterna: false } } : x)) }
    })
    almacen.getState().seleccionar({ tipo: 'elemento', id: inodoro })
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.esDeTienda }))
    expect(screen.queryByLabelText(t.campos.alto)).toBeNull()
    await rellenar(t.campos.proveedor, 'Roca')
    await rellenar(t.campos.nombre, 'Meridian')
    await userEvent.click(screen.getByRole('button', { name: t.guardar }))
    const e = almacen.getState().documento!.elementos.find((x) => x.id === inodoro)!
    expect(within(screen.getByRole('region', { name: t.titulo })).getByText(`${e.medidas.ancho} × ${e.medidas.fondo} × 40 cm`)).toBeInTheDocument()
  })
})
