import { describe, expect, it } from 'vitest'
import { catalogoBase } from '../catalogo/catalogoBase'
import { documentoNuevo } from '../modelo/crear'
import type { DocumentoDiseno } from '../modelo/documento'
import { validarDocumento } from '../modelo/validar'
import { detectarConflictos } from '../conflictos/detectar'
import { anadirElemento, duplicarElemento, editarElemento, moverElemento, quitarElemento } from './elementos'

const sala = (): DocumentoDiseno => documentoNuevo('dormitorio', 400, 330, 250)
const conArmario = () => anadirElemento(sala(), catalogoBase, 'armario', { x: 200, y: 165 })

describe('anadirElemento', () => {
  it('crea el elemento imantado sin mutar el documento ni la posición', () => {
    const doc = sala()
    const posicion = { x: 200, y: 38 }
    const { documento, id } = anadirElemento(doc, catalogoBase, 'armario', posicion)
    expect(doc.elementos).toEqual([])
    const e = documento.elementos.find(x => x.id === id)!
    expect(e.tipo).toBe('armario')
    expect(e.posicion).toEqual({ x: 200, y: 30 })
    expect(posicion).toEqual({ x: 200, y: 38 })
    expect(validarDocumento(documento).valido).toBe(true)
  })
})

describe('moverElemento', () => {
  it('mueve e imanta, sin mutar', () => {
    const { documento, id } = conArmario()
    const r = moverElemento(documento, catalogoBase, id, { x: 50, y: 300 }, 0, false)
    expect(r.elementos[0].posicion).toEqual({ x: 50, y: 300 })
    expect(documento.elementos[0].posicion).toEqual({ x: 200, y: 165 })
    expect(moverElemento(documento, catalogoBase, id, { x: 100, y: 100 }, 93, true).elementos[0].rotacion).toBe(93)
  })
})

describe('editarElemento', () => {
  it('ajusta las medidas al rango', () => {
    const { documento, id } = conArmario()
    const r = editarElemento(documento, catalogoBase, id, { medidas: { ancho: 9999 } })
    expect(r.elementos[0].medidas).toEqual({ ancho: 400, fondo: 60, alto: 220 })
    expect(documento.elementos[0].medidas.ancho).toBe(100)
  })
  it('normaliza el giro', () => {
    const { documento, id } = conArmario()
    expect(editarElemento(documento, catalogoBase, id, { rotacion: -90 }).elementos[0].rotacion).toBe(270)
    expect(editarElemento(documento, catalogoBase, id, { rotacion: 725.4 }).elementos[0].rotacion).toBe(5)
  })
  it('recorta alturaSuelo si es editable', () => {
    const { documento, id } = anadirElemento(sala(), catalogoBase, 'cuadro', { x: 200, y: 165 })
    const r = editarElemento(documento, catalogoBase, id, { alturaSuelo: 300 })
    expect(r.elementos[0].alturaSuelo).toBe(210)
    expect(editarElemento(documento, catalogoBase, id, { alturaSuelo: -5 }).elementos[0].alturaSuelo).toBe(0)
  })
  it('ignora alturaSuelo si no es editable', () => {
    const { documento, id } = conArmario()
    expect(editarElemento(documento, catalogoBase, id, { alturaSuelo: 50 }).elementos[0].alturaSuelo).toBe(0)
  })
  it('fusiona variantes y colores', () => {
    const { documento, id } = conArmario()
    const r = editarElemento(documento, catalogoBase, id, { variantes: { modulos: 3 }, colores: { cuerpo: '#000000' } })
    expect(r.elementos[0].variantes).toEqual({ puertas: 'abatibles', modulos: 3 })
    expect(r.elementos[0].colores).toEqual({ cuerpo: '#000000' })
    expect(documento.elementos[0].variantes.modulos).toBe(1)
  })
})

describe('duplicarElemento', () => {
  it('da un id nuevo con el mismo tipo y medidas, desplazado', () => {
    const { documento, id } = conArmario()
    const r = duplicarElemento(documento, catalogoBase, id)
    expect(r.id).not.toBe(id)
    expect(r.documento.elementos).toHaveLength(2)
    const copia = r.documento.elementos.find(e => e.id === r.id)!
    const original = documento.elementos[0]
    expect(copia.tipo).toBe(original.tipo)
    expect(copia.medidas).toEqual(original.medidas)
    expect(copia.medidas).not.toBe(original.medidas)
    expect(copia.posicion).toEqual({ x: 220, y: 185 })
    expect(validarDocumento(r.documento).valido).toBe(true)
  })
})

describe('quitarElemento', () => {
  it('quita el elemento y con un id inexistente devuelve el mismo documento', () => {
    const { documento, id } = conArmario()
    expect(quitarElemento(documento, id).elementos).toEqual([])
    expect(documento.elementos).toHaveLength(1)
    expect(quitarElemento(documento, 'no-existe')).toBe(documento)
  })
})

describe('editarElemento con el elemento pegado a una pared', () => {
  it('un armario a ras de la pared de arriba que crece de fondo sigue a ras y sin salirse', () => {
    const { documento, id } = anadirElemento(sala(), catalogoBase, 'armario', { x: 200, y: 38 })
    expect(documento.elementos[0].posicion).toEqual({ x: 200, y: 30 })
    const r = editarElemento(documento, catalogoBase, id, { medidas: { fondo: 66 } })
    expect(r.elementos[0].posicion).toEqual({ x: 200, y: 33 })
    expect(detectarConflictos(r, catalogoBase).filter(c => c.tipo === 'fueraDeEstancia')).toEqual([])
  })
  it('al girarlo 90° también vuelve a quedar a ras', () => {
    const { documento, id } = anadirElemento(sala(), catalogoBase, 'armario', { x: 200, y: 38 })
    const r = editarElemento(documento, catalogoBase, id, { rotacion: 90 })
    expect(r.elementos[0].rotacion).toBe(90)
    expect(r.elementos[0].posicion).toEqual({ x: 200, y: 50 })
  })
  it('un elemento suelto no se mueve al cambiar sus medidas', () => {
    const { documento, id } = conArmario()
    const r = editarElemento(documento, catalogoBase, id, { medidas: { fondo: 66, ancho: 150 } })
    expect(r.elementos[0].posicion).toEqual({ x: 200, y: 165 })
  })
})
