// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { catalogoBase, documentoNuevo, elementoNuevo, type DocumentoDiseno } from '../../nucleo'
import { textos } from '../../textos'
import TablaDeMuebles from './TablaDeMuebles'

const t = textos.tienda

function conProductos(): DocumentoDiseno {
  const d = documentoNuevo('dormitorio', 400, 300, 250)
  const armario = elementoNuevo(catalogoBase.get('armario')!, { x: 100, y: 50 }, 'a')
  const mesita = elementoNuevo(catalogoBase.get('mesita')!, { x: 300, y: 200 }, 'm')
  d.elementos = [
    { ...armario, origen: { tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX', url: 'https://www.ikea.com/es/es/p/pax/', precio: 199, fechaPrecio: '2026-11-03' } },
    mesita,
  ]
  return d
}

describe('TablaDeMuebles con muebles de tienda', () => {
  it('en papel: la URL en texto, el total, el aviso de precios y la nota de marcas', () => {
    render(<TablaDeMuebles doc={conProductos()} />)
    const tabla = screen.getByRole('table')
    expect(within(tabla).getByText('PAX')).toBeInTheDocument()
    expect(within(tabla).getByText('Armario · IKEA')).toBeInTheDocument()
    expect(within(tabla).getByText('https://www.ikea.com/es/es/p/pax/')).toBeInTheDocument()
    expect(within(tabla).queryByRole('link')).toBeNull()
    expect(within(tabla).getByText(/^Total anotado: 199,00\s€ \(1 producto\)$/)).toBeInTheDocument()
    expect(screen.getByText(t.avisoPrecios)).toBeInTheDocument()
    expect(screen.getByText(t.marcas)).toBeInTheDocument()
  })

  it('en la página compartida: «Ver en la tienda» enlazado, en pestaña nueva y sin pasar datos', () => {
    render(<TablaDeMuebles doc={conProductos()} enlaces />)
    const enlace = screen.getByRole('link', { name: t.verEnTienda })
    expect(enlace).toHaveAttribute('href', 'https://www.ikea.com/es/es/p/pax/')
    expect(enlace).toHaveAttribute('target', '_blank')
    expect(enlace).toHaveAttribute('rel', 'noopener noreferrer nofollow')
  })

  it('sin muebles de tienda, ni total ni notas', () => {
    const d = documentoNuevo('dormitorio', 400, 300, 250)
    d.elementos = [elementoNuevo(catalogoBase.get('mesita')!, { x: 300, y: 200 }, 'm')]
    render(<TablaDeMuebles doc={d} enlaces />)
    expect(screen.queryByText(/Total anotado/)).toBeNull()
    expect(screen.queryByText(t.marcas)).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('con productos de tienda sin precio, la nota de marcas pero no el total', () => {
    const d = documentoNuevo('dormitorio', 400, 300, 250)
    const armario = elementoNuevo(catalogoBase.get('armario')!, { x: 100, y: 50 }, 'a')
    d.elementos = [{ ...armario, origen: { tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX' } }]
    render(<TablaDeMuebles doc={d} />)
    expect(screen.getByText(t.marcas)).toBeInTheDocument()
    expect(screen.queryByText(/Total anotado/)).toBeNull()
    expect(screen.queryByText(t.avisoPrecios)).toBeNull()
  })
})
