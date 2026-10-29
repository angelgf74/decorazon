import { describe, expect, it } from 'vitest'
import { textos } from '../../textos'
import { documentoNuevo } from '../modelo/crear'
import type { Columna, DocumentoDiseno, Puerta, Radiador, Ventana, Viga } from '../modelo/documento'
import { anadirAbertura, anadirEstructura, editarAbertura, editarEstancia, editarEstructura, quitarDeEstancia } from './estancia'
import type { ResultadoEdicion } from './resultado'

const sala = (): DocumentoDiseno => documentoNuevo('dormitorio', 400, 330, 250)
function documento(r: ResultadoEdicion): DocumentoDiseno {
  if (!r.ok) throw new Error(`se esperaba ok y vino: ${r.motivo}`)
  return r.documento
}
function motivo(r: ResultadoEdicion): string {
  if (r.ok) throw new Error('se esperaba un fallo')
  return r.motivo
}

describe('anadirAbertura', () => {
  it('pone una puerta centrada con los valores por defecto', () => {
    const doc = sala()
    const p = documento(anadirAbertura(doc, 'puerta', 0)).aberturas[0] as Puerta
    expect(p).toMatchObject({ tipo: 'puerta', pared: 0, posicion: 159, ancho: 82, alto: 203, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' })
    expect(p.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(doc.aberturas).toEqual([])
  })
  it('pone una ventana centrada', () => {
    const v = documento(anadirAbertura(sala(), 'ventana', 1)).aberturas[0] as Ventana
    expect(v).toMatchObject({ tipo: 'ventana', pared: 1, posicion: 105, ancho: 120, alto: 120, alturaSuelo: 90, abreHaciaDentro: true })
  })
  it('falla si no cabe en la pared', () => {
    expect(motivo(anadirAbertura(documentoNuevo('dormitorio', 60, 330, 250), 'puerta', 0))).toBe(textos.edicion.noCabeEnPared)
  })
  it('falla con una pared que no existe', () => {
    expect(motivo(anadirAbertura(sala(), 'puerta', 4))).toBe(textos.edicion.cambioNoValido)
  })
})

describe('editarAbertura', () => {
  it('aplica los cambios si cabe', () => {
    const doc = documento(anadirAbertura(sala(), 'puerta', 0))
    const id = doc.aberturas[0].id
    const r = documento(editarAbertura(doc, id, { posicion: 10, bisagra: 'derecha' }))
    expect(r.aberturas[0]).toMatchObject({ id, posicion: 10, bisagra: 'derecha' })
    expect(doc.aberturas[0].posicion).toBe(159)
  })
  it('falla si se sale de la pared', () => {
    const doc = documento(anadirAbertura(sala(), 'puerta', 0))
    const antes = JSON.stringify(doc)
    expect(motivo(editarAbertura(doc, doc.aberturas[0].id, { posicion: 390 }))).toBe(textos.edicion.noCabeEnPared)
    expect(motivo(editarAbertura(doc, doc.aberturas[0].id, { posicion: -1 }))).toBe(textos.edicion.noCabeEnPared)
    expect(JSON.stringify(doc)).toBe(antes)
  })
  it('falla si no pasa la validación o no existe', () => {
    const doc = documento(anadirAbertura(sala(), 'puerta', 0))
    expect(motivo(editarAbertura(doc, doc.aberturas[0].id, { alto: 10.5 }))).toBe(textos.edicion.cambioNoValido)
    expect(motivo(editarAbertura(doc, 'no-existe', { alto: 100 }))).toBe(textos.edicion.cambioNoValido)
  })
})

describe('anadirEstructura', () => {
  it('columna en el centro de la caja envolvente', () => {
    const c = documento(anadirEstructura(sala(), 'columna')).estructura[0] as Columna
    expect(c).toMatchObject({ tipo: 'columna', centro: { x: 200, y: 165 }, ancho: 30, fondo: 30, rotacion: 0 })
  })
  it('columna redondeada en una planta impar', () => {
    const c = documento(anadirEstructura(documentoNuevo('dormitorio', 401, 331, 250), 'columna')).estructura[0] as Columna
    expect(c.centro).toEqual({ x: 201, y: 166 })
  })
  it('viga vertical por el centro', () => {
    const v = documento(anadirEstructura(sala(), 'viga')).estructura[0] as Viga
    expect(v).toMatchObject({ tipo: 'viga', desde: { x: 200, y: 0 }, hasta: { x: 200, y: 330 }, ancho: 20, canto: 30 })
  })
  it('radiador centrado en la pared', () => {
    const r = documento(anadirEstructura(sala(), 'radiador', 2)).estructura[0] as Radiador
    expect(r).toMatchObject({ tipo: 'radiador', pared: 2, posicion: 160, ancho: 80, alto: 60, fondo: 10, alturaSuelo: 15 })
  })
})

describe('editarEstructura y quitarDeEstancia', () => {
  it('edita un radiador comprobando que cabe', () => {
    const doc = documento(anadirEstructura(sala(), 'radiador', 0))
    const id = doc.estructura[0].id
    expect((documento(editarEstructura(doc, id, { ancho: 100 })).estructura[0] as Radiador).ancho).toBe(100)
    expect(motivo(editarEstructura(doc, id, { posicion: 350 }))).toBe(textos.edicion.noCabeEnPared)
  })
  it('edita una columna', () => {
    const doc = documento(anadirEstructura(sala(), 'columna'))
    const r = documento(editarEstructura(doc, doc.estructura[0].id, { centro: { x: 50, y: 50 } }))
    expect((r.estructura[0] as Columna).centro).toEqual({ x: 50, y: 50 })
  })
  it('quita aberturas y estructura por id', () => {
    const doc = documento(anadirEstructura(documento(anadirAbertura(sala(), 'puerta', 0)), 'columna'))
    const r = quitarDeEstancia(quitarDeEstancia(doc, doc.aberturas[0].id), doc.estructura[0].id)
    expect(r.aberturas).toEqual([])
    expect(r.estructura).toEqual([])
    expect(doc.aberturas).toHaveLength(1)
  })
})

describe('editarEstancia y el techo', () => {
  const conHuecos = (): DocumentoDiseno => {
    const d = sala()
    d.aberturas.push(
      { id: 'p', tipo: 'puerta', pared: 0, posicion: 20, ancho: 80, alto: 210, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' },
      { id: 'v', tipo: 'ventana', pared: 1, posicion: 50, ancho: 100, alto: 120, alturaSuelo: 100, abreHaciaDentro: true },
    )
    d.estructura.push({ id: 'r', tipo: 'radiador', pared: 2, posicion: 50, ancho: 60, alto: 60, fondo: 10, alturaSuelo: 15 })
    return d
  }
  it('cambia el alto y el grosor si todo cabe bajo el techo', () => {
    const r = documento(editarEstancia(conHuecos(), { alto: 220, grosorPared: 20 }))
    expect(r.estancia.alto).toBe(220)
    expect(r.estancia.grosorPared).toBe(20)
  })
  it('falla si una ventana quedaría por encima del techo y no muta', () => {
    const doc = conHuecos()
    const antes = JSON.stringify(doc)
    expect(motivo(editarEstancia(doc, { alto: 215 }))).toBe(textos.edicion.porEncimaDelTecho)
    expect(JSON.stringify(doc)).toBe(antes)
  })
  it('falla si una puerta es más alta que el techo', () => {
    const doc = sala()
    doc.aberturas.push({ id: 'p', tipo: 'puerta', pared: 0, posicion: 20, ancho: 80, alto: 210, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' })
    expect(motivo(editarEstancia(doc, { alto: 205 }))).toBe(textos.edicion.porEncimaDelTecho)
  })
  it('falla si un radiador quedaría por encima del techo', () => {
    const doc = sala()
    doc.estructura.push({ id: 'r', tipo: 'radiador', pared: 2, posicion: 50, ancho: 60, alto: 60, fondo: 10, alturaSuelo: 200 })
    expect(motivo(editarEstancia(doc, { alto: 255 }))).toBe(textos.edicion.porEncimaDelTecho)
  })
  it('editar una ventana para que pase del techo también falla', () => {
    expect(motivo(editarAbertura(conHuecos(), 'v', { alturaSuelo: 140 }))).toBe(textos.edicion.porEncimaDelTecho)
  })
  it('un grosor no válido falla', () => {
    expect(motivo(editarEstancia(sala(), { grosorPared: 0 }))).toBe(textos.edicion.cambioNoValido)
  })
})
