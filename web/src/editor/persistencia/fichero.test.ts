// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { catalogoBase, documentoNuevo, elementoNuevo, validarDocumento } from '../../nucleo'
import * as descargas from '../comunes/descargar'
import { EXTENSION, exportarDiseno, importarDiseno } from './fichero'

afterEach(() => vi.restoreAllMocks())

function salon() {
  const doc = documentoNuevo('salon', 400, 330, 250)
  doc.elementos = [elementoNuevo(catalogoBase.get('sofa')!, { x: 200.004999, y: 165 }, 's')]
  return doc
}

describe('exportarDiseno', () => {
  it('descarga <nombre>.decorazon.json con un JSON que pasa la validación y los números redondeados', async () => {
    const descargar = vi.spyOn(descargas, 'descargar').mockImplementation(() => {})
    exportarDiseno(salon(), 'Salón de Ana / 2')
    expect(descargar).toHaveBeenCalledOnce()
    const [nombre, blob] = descargar.mock.calls[0]!
    expect(nombre).toBe(`Salón de Ana - 2${EXTENSION}`)
    expect(blob).toBeInstanceOf(Blob)
    expect((blob as Blob).type).toBe('application/json')
    const texto = await (blob as Blob).text()
    expect(validarDocumento(JSON.parse(texto)).valido).toBe(true)
    expect(texto).toContain('"x":200,')
  })
})

describe('importarDiseno', () => {
  it('lee un fichero válido y da el documento y el nombre sin la extensión', async () => {
    const doc = salon()
    const fichero = new File([JSON.stringify(doc)], `Salón de Ana${EXTENSION}`, { type: 'application/json' })
    expect(await importarDiseno(fichero)).toEqual({ ok: true, documento: doc, nombre: 'Salón de Ana' })
  })

  it('un .json sin el sufijo también vale, y el nombre pierde solo el .json', async () => {
    const r = await importarDiseno(new File([JSON.stringify(salon())], 'cocina.json'))
    expect(r.ok && r.nombre).toBe('cocina')
  })

  it('un JSON que no es un diseño, un JSON roto o un fichero enorme dan ok: false', async () => {
    expect(await importarDiseno(new File(['{"formato":1}'], 'a.json'))).toEqual({ ok: false })
    expect(await importarDiseno(new File(['{no es json'], 'b.json'))).toEqual({ ok: false })
    expect(await importarDiseno(new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'c.json'))).toEqual({ ok: false })
  })
})
