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
    expect(screen.getByLabelText(t.campos.url)).toHaveFocus()
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
  it('al abrir, el foco va al enlace; al guardar, a «Editar producto»; al desvincular, a «Es de una tienda»; al cancelar, también', async () => {
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.esDeTienda }))
    expect(screen.getByLabelText(t.campos.url)).toHaveFocus()
    await rellenar(t.campos.proveedor, 'IKEA')
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

describe('ProductoDeTienda: el enlace primero', () => {
  const PAX = 'https://www.ikea.com/es/es/p/pax-grimo-armario-esquinero-blanco-blanco-s29502652'
  const valor = (etiqueta: string) => (screen.getByLabelText(etiqueta) as HTMLInputElement).value

  async function pegar(etiqueta: string, texto: string) {
    await userEvent.click(screen.getByLabelText(etiqueta))
    await userEvent.paste(texto)
  }

  it('el enlace es el primer campo del formulario', async () => {
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.esDeTienda }))
    const formulario = screen.getByRole('form', { name: t.titulo })
    expect(within(formulario).getAllByRole('textbox')[0]).toBe(screen.getByLabelText(t.campos.url))
  })

  it('pegar el enlace de ejemplo rellena tienda, nombre y referencia, avisa de que es un esquinero y lo dice', async () => {
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.esDeTienda }))
    await pegar(t.campos.url, PAX)
    expect(valor(t.campos.proveedor)).toBe('IKEA')
    expect(valor(t.campos.nombre)).toBe('PAX / GRIMO')
    expect(valor(t.campos.referencia)).toBe('295.026.52')
    expect(screen.getByText(t.rellenado)).toBeInTheDocument()
    expect(screen.getByText(t.pareceOtroTipo('un armario esquinero'))).toBeInTheDocument()
    // Medidas y precio no salen del enlace.
    expect(valor(t.campos.precio)).toBe('')
  })

  it('no pisa lo que ya estaba escrito; al salir del campo, rellena lo que falte', async () => {
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.esDeTienda }))
    await rellenar(t.campos.nombre, 'Mi armario')
    await rellenar(t.campos.url, PAX)
    await userEvent.tab()
    expect(valor(t.campos.nombre)).toBe('Mi armario')
    expect(valor(t.campos.proveedor)).toBe('IKEA')
  })

  it('«Cambiar a armario esquinero» convierte el mueble (un solo deshacer) y el formulario sigue con lo escrito', async () => {
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.esDeTienda }))
    await pegar(t.campos.url, PAX)
    await userEvent.click(screen.getByRole('button', { name: t.cambiarA('armario esquinero') }))
    expect(elemento().tipo).toBe('armario-esquinero')
    expect(elemento().id).toBe(id)
    expect(screen.queryByText(t.pareceOtroTipo('un armario esquinero'))).toBeNull()
    expect(valor(t.campos.nombre)).toBe('PAX / GRIMO')
    // Lo escrito se queda, también las medidas; el foco, en el enlace (no en la página, donde Supr borraría el mueble).
    expect(valor(t.campos.fondo)).toBe('60')
    expect(screen.getByLabelText(t.campos.url)).toHaveFocus()
    almacen.getState().deshacer()
    expect(elemento().tipo).toBe('armario')
  })

  it('pegar las medidas de la ficha rellena ancho, fondo y alto; guardar aplica el color del enlace a la primera zona', async () => {
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.esDeTienda }))
    await pegar(t.campos.url, PAX)
    await userEvent.click(screen.getByRole('button', { name: t.cambiarA('armario esquinero') }))
    await pegar(t.medidasPegadas, '110/110x201 cm')
    expect([valor(t.campos.ancho), valor(t.campos.fondo), valor(t.campos.alto)]).toEqual(['110', '110', '201'])
    await userEvent.click(screen.getByRole('button', { name: t.guardar }))
    expect(elemento()).toMatchObject({
      tipo: 'armario-esquinero',
      medidas: { ancho: 110, fondo: 110, alto: 201 },
      origen: { tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX / GRIMO', referencia: '295.026.52', url: PAX },
      colores: { cuerpo: '#f2f2f0' },
    })
  })

  it('un enlace que no se lee no rellena nada ni enseña la nota', async () => {
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.esDeTienda }))
    await pegar(t.campos.url, 'esto no es un enlace')
    expect(valor(t.campos.proveedor)).toBe('')
    expect(screen.queryByText(t.rellenado)).toBeNull()
  })
})

describe('ProductoDeTienda: lo leído sigue al enlace', () => {
  const PAX = 'https://www.ikea.com/es/es/p/pax-grimo-armario-esquinero-blanco-blanco-s29502652'
  const MALM = 'https://www.ikea.com/es/es/p/malm-comoda-de-6-cajones-roble-80403586/'
  const valor = (etiqueta: string) => (screen.getByLabelText(etiqueta) as HTMLInputElement).value

  async function pegarEnlace(texto: string) {
    const campo = screen.getByLabelText(t.campos.url)
    await userEvent.clear(campo)
    await userEvent.click(campo)
    await userEvent.paste(texto)
  }

  it('un segundo enlace sustituye lo que rellenó el primero, pero no lo que tecleó el usuario', async () => {
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.esDeTienda }))
    await pegarEnlace(PAX)
    await rellenar(t.campos.referencia, 'mi-ref')
    await pegarEnlace(MALM)
    expect(valor(t.campos.nombre)).toBe('MALM')
    expect(valor(t.campos.referencia)).toBe('mi-ref')
    expect(screen.getByText(t.pareceOtroTipo('una cómoda'))).toBeInTheDocument()
    expect(screen.queryByText(t.pareceOtroTipo('un armario esquinero'))).toBeNull()
  })

  it('al borrar el enlace se van el aviso de tipo y la nota, y al guardar no se pinta su color', async () => {
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.esDeTienda }))
    await pegarEnlace(PAX)
    await userEvent.clear(screen.getByLabelText(t.campos.url))
    expect(screen.queryByText(t.pareceOtroTipo('un armario esquinero'))).toBeNull()
    expect(screen.queryByText(t.rellenado)).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: t.guardar }))
    expect(elemento().colores.cuerpo).not.toBe('#f2f2f0')
    expect(elemento().origen).toMatchObject({ tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX / GRIMO' })
  })

  it('al volver a «Editar producto» no se vuelve a leer el enlace guardado: ni nota, ni aviso, ni se pisa el color elegido', async () => {
    vincular({ tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX / GRIMO', url: PAX })
    almacen.getState().cambiar((d) => ({ ...d, elementos: d.elementos.map((x) => ({ ...x, colores: { cuerpo: '#123456' } })) }))
    render(<PanelPropiedades />)
    await userEvent.click(screen.getByRole('button', { name: t.editar }))
    await userEvent.tab()
    expect(screen.queryByText(t.rellenado)).toBeNull()
    expect(screen.queryByText(t.pareceOtroTipo('un armario esquinero'))).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: t.guardar }))
    expect(elemento().colores.cuerpo).toBe('#123456')
  })
})

