import { describe, expect, it } from 'vitest'
import { catalogoBase } from '../catalogo/catalogoBase'
import { elementoNuevo } from '../catalogo/elemento'
import { rotar, sumar } from '../geometria/vector'
import { documentoNuevo } from '../modelo/crear'
import { redondearNumeros, serializarDocumento } from './serializar'

describe('redondearNumeros', () => {
  it('redondea a 2 decimales y quita el -0', () => {
    const r = redondearNumeros({ a: 6.123233995736766e-17, b: [100.004999], c: -0 })
    expect(r).toEqual({ a: 0, b: [100], c: 0 })
    expect(Object.is(r.c, 0)).toBe(true)
  })
  it('no muta la entrada', () => {
    const v = { a: [1.234] }
    redondearNumeros(v)
    expect(v.a[0]).toBe(1.234)
  })
})

describe('serializarDocumento', () => {
  it('no emite exponentes tras muchos giros y movimientos, y deja las cadenas igual', () => {
    const doc = documentoNuevo('dormitorio', 400, 330, 250)
    const armario = elementoNuevo(catalogoBase.get('armario')!, { x: 200, y: 165 }, 'armario-1')
    doc.elementos.push(armario)
    const colores = { ...armario.colores }
    let semilla = 12345
    const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647
    const centro = { x: 200, y: 165 }
    for (let i = 0; i < 200; i++) {
      const giro = [90, 180, 270, 45, azar() * 360][i % 5]
      const relativo = rotar({ x: armario.posicion.x - centro.x + 1, y: armario.posicion.y - centro.y }, giro)
      armario.posicion = sumar(sumar(centro, relativo), { x: (azar() - 0.5) * 1e-12, y: (azar() - 0.5) * 1e-12 })
      armario.rotacion = (armario.rotacion + 90) % 360
    }
    doc.elementos.push({ ...elementoNuevo(catalogoBase.get('cuadro')!, { x: 6.123233995736766e-17, y: -1e-20 }, 'cuadro-1'), rotacion: -0 })
    expect(JSON.stringify(doc)).toMatch(/\d[eE][+-]?\d/)
    const json = serializarDocumento(doc)
    // Los colores en hexadecimal ('#e8e4dc') casarían con la expresión: se mira solo fuera de las cadenas.
    const sinCadenas = json.replace(/"(?:[^"\\]|\\.)*"/g, '""')
    expect(sinCadenas).not.toMatch(/\d[eE][+-]?\d/)
    const leido = JSON.parse(json)
    expect(leido.elementos[0].colores).toEqual(colores)
    expect(leido.estancia.colorParedes).toBe(doc.estancia.colorParedes)
    expect(leido.elementos[0].id).toBe(armario.id)
  })
})
