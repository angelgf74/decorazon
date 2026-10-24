import { describe, expect, it } from 'vitest'
import { documentoNuevo } from '../modelo/crear'
import type { DocumentoDiseno } from '../modelo/documento'
import { catalogoBase } from '../catalogo/catalogoBase'
import { elemento } from '../catalogo/definiciones/ayuda.test-util'
import { detectarConflictos, HUECO_IGNORADO_CM, PASO_MINIMO_CM } from './detectar'
import type { TipoConflicto } from './tipos'

const base = () => documentoNuevo('dormitorio', 400, 330, 250)
const de = (doc: DocumentoDiseno, tipo: TipoConflicto) => detectarConflictos(doc, catalogoBase).filter((c) => c.tipo === tipo)
const mensajes = (doc: DocumentoDiseno, tipo: TipoConflicto) => de(doc, tipo).map((c) => c.mensaje)

describe('detectarConflictos', () => {
  it('constantes de paso', () => {
    expect(PASO_MINIMO_CM).toBe(60)
    expect(HUECO_IGNORADO_CM).toBe(20)
  })

  it('1. armario bajo una viga', () => {
    const doc = base()
    doc.estructura.push({ id: 'v1', tipo: 'viga', desde: { x: 0, y: 150 }, hasta: { x: 400, y: 150 }, ancho: 20, canto: 20 })
    doc.elementos.push(elemento('armario', 200, 150, 0, { alto: 240 }, {}, 'a1'))
    expect(de(doc, 'viga')).toEqual([{ tipo: 'viga', gravedad: 'error', ids: ['a1', 'v1'], cantidadCm: 10, mensaje: 'El armario no cabe bajo la viga: sobran 10 cm' }])
    expect(de(doc, 'solape')).toEqual([])
  })

  it('2. puerta del armario contra la cama', () => {
    const doc = base()
    doc.elementos.push(elemento('armario', 100, 30, 0, {}, {}, 'a1'), elemento('cama', 100, 198, 0, {}, {}, 'c1'))
    const c = de(doc, 'apertura')
    expect(c.map((x) => x.mensaje)).toContain('La puerta del armario choca con la cama: faltan 12 cm')
    expect(c[0]).toMatchObject({ gravedad: 'error', ids: ['a1', 'c1'] })
  })

  it('3. cómoda girada 180° con el frente a 30 cm de la pared', () => {
    const doc = base()
    doc.elementos.push(elemento('comoda', 200, 55, 180, {}, {}, 'm1'))
    expect(de(doc, 'apertura')).toEqual([{ tipo: 'apertura', gravedad: 'error', ids: ['m1'], cantidadCm: 15, mensaje: 'El cajón de la cómoda choca con la pared: faltan 15 cm' }])
  })

  it('4. puerta de la estancia contra un armario', () => {
    const doc = base()
    doc.aberturas.push({ id: 'p1', tipo: 'puerta', pared: 0, posicion: 20, ancho: 80, alto: 210, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' })
    doc.elementos.push(elemento('armario', 60, 60, 0, {}, {}, 'a1'))
    const c = de(doc, 'apertura')
    expect(c).toHaveLength(1)
    expect(c[0].mensaje.startsWith('La puerta choca con el armario: faltan')).toBe(true)
    expect(c[0].ids).toEqual(['p1', 'a1'])
  })

  it('5. cama que atraviesa una columna', () => {
    const doc = base()
    doc.estructura.push({ id: 'k1', tipo: 'columna', centro: { x: 162, y: 100 }, ancho: 40, fondo: 40, rotacion: 0 })
    doc.elementos.push(elemento('cama', 75, 100, 0, {}, {}, 'c1'))
    expect(de(doc, 'solape')).toEqual([{ tipo: 'solape', gravedad: 'error', ids: ['c1', 'k1'], cantidadCm: 8, mensaje: 'La cama y la columna se solapan 8 cm' }])
  })

  it('6. piezas que se tocan exactamente no se solapan', () => {
    for (const [cama, comoda] of [
      [elemento('cama', 75, 100, 0), elemento('comoda', 200, 25, 0)],
      [elemento('cama', 75, 100, 0), elemento('comoda', 175, 50, 90)],
      [elemento('cama', 100, 75, 90), elemento('comoda', 250, 25, 0)],
      [elemento('cama', 100, 75, 90), elemento('comoda', 225, 50, 90)],
    ]) {
      const doc = base()
      doc.elementos.push(cama, comoda)
      expect(de(doc, 'solape')).toEqual([])
    }
  })

  it('cama a 45°: 0,05 cm fuera de la pared se tolera; 3 cm no', () => {
    const semi = (150 + 200) / 2 / Math.SQRT2
    const a = base()
    a.elementos.push(elemento('cama', semi - 0.05, 200, 45))
    expect(de(a, 'fueraDeEstancia')).toEqual([])
    const b = base()
    b.elementos.push(elemento('cama', semi - 3, 200, 45, {}, {}, 'c1'))
    expect(de(b, 'fueraDeEstancia')).toEqual([{ tipo: 'fueraDeEstancia', gravedad: 'error', ids: ['c1'], cantidadCm: 3, mensaje: 'La cama atraviesa la pared: sobran 3 cm' }])
  })

  it('armario girado 30° tapando parte del barrido de la puerta', () => {
    // Puerta de 80 con bisagra en (20, 0) y barrido de radio 80. Armario 100×60 en (80, 100) girado 30°:
    // su esquina trasera izquierda es (80, 100) + rotar((-50, -30), 30°) = (51.70, 49.02), a 58.38 cm de la
    // bisagra (ángulo 57.1°). El eje de separación más corto del barrido es el radial que pasa por esa esquina:
    // 80 - 58.38 = 21.62 cm (los demás ejes dan más: y 30.98, ejes del armario 28.04 y 42.68, x 78.30).
    // La franja del hueco (y 0..60) da 60 - 49.02 = 10.98. Máximo 21.62 -> se muestra ceil(21.62 - 0.1) = 22.
    const doc = base()
    doc.aberturas.push({ id: 'p1', tipo: 'puerta', pared: 0, posicion: 20, ancho: 80, alto: 210, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' })
    doc.elementos.push(elemento('armario', 80, 100, 30, {}, {}, 'a1'))
    const c = de(doc, 'apertura').filter((x) => x.ids[0] === 'p1')
    expect(c).toEqual([{ tipo: 'apertura', gravedad: 'error', ids: ['p1', 'a1'], cantidadCm: 22, mensaje: 'La puerta choca con el armario: faltan 22 cm' }])
  })

  it('armario más alto que el techo', () => {
    const doc = base()
    doc.elementos.push(elemento('armario', 200, 165, 0, { alto: 260 }, {}, 'a1'))
    expect(de(doc, 'techo')).toEqual([{ tipo: 'techo', gravedad: 'error', ids: ['a1'], cantidadCm: 10, mensaje: 'El armario no cabe bajo el techo: sobran 10 cm' }])
  })

  it('cómoda delante de una ventana', () => {
    for (const [suelo, esperado] of [[80, ['La cómoda tapa la ventana']], [90, []]] as const) {
      const doc = base()
      doc.aberturas.push({ id: 'v1', tipo: 'ventana', pared: 1, posicion: 100, ancho: 100, alto: 120, alturaSuelo: suelo, abreHaciaDentro: false })
      doc.elementos.push(elemento('comoda', 370, 150, 90))
      expect(mensajes(doc, 'tapaVentana')).toEqual(esperado)
    }
  })

  it('cómoda delante de un radiador', () => {
    const doc = base()
    doc.estructura.push({ id: 'r1', tipo: 'radiador', pared: 0, posicion: 100, ancho: 80, alto: 60, fondo: 10, alturaSuelo: 20 })
    doc.elementos.push(elemento('comoda', 140, 40, 0))
    expect(mensajes(doc, 'tapaRadiador')).toEqual(['La cómoda tapa el radiador'])
  })

  it('paso estrecho entre cama y armario', () => {
    const a = base()
    a.elementos.push(elemento('cama', 75, 100, 0), elemento('armario', 245, 100, 0))
    expect(de(a, 'pasoEstrecho').filter((c) => c.mensaje.includes('la cama y el armario'))).toEqual([
      expect.objectContaining({ gravedad: 'aviso', cantidadCm: 45, mensaje: 'Paso estrecho entre la cama y el armario: 45 cm' }),
    ])
    const b = base()
    b.elementos.push(elemento('cama', 75, 100, 0), elemento('armario', 210, 100, 0))
    expect(mensajes(b, 'pasoEstrecho').filter((m) => m.includes('la cama y el armario'))).toEqual([])
  })

  it('paso estrecho contra la pared y una columna', () => {
    const a = base()
    a.elementos.push(elemento('armario', 200, 165, 0))
    expect(mensajes(a, 'pasoEstrecho')).toEqual([])
    const b = base()
    b.elementos.push(elemento('armario', 50, 100, 0))
    b.estructura.push({ id: 'k1', tipo: 'columna', centro: { x: 150, y: 100 }, ancho: 20, fondo: 20, rotacion: 0 })
    expect(mensajes(b, 'pasoEstrecho')).toContain('Paso estrecho entre el armario y la columna: 40 cm')
    const c = base()
    c.elementos.push(elemento('armario', 200, 40, 0))
    c.elementos.push(elemento('armario', 200, 260, 0))
    // armario 1: y 10..70 -> 10 cm a la pared (ignorado); armario 2 en 230..290 -> 40 cm a la pared inferior
    expect(mensajes(c, 'pasoEstrecho')).toContain('Paso estrecho entre el armario y la pared: 40 cm')
  })

  it('paso estrecho por tramo de pared: cabecero pegado arriba, 40 cm a la pared lateral', () => {
    const doc = base()
    doc.elementos.push(elemento('cama', 115, 100, 0, {}, {}, 'c1'))
    const c = de(doc, 'pasoEstrecho')
    expect(c).toEqual([{ tipo: 'pasoEstrecho', gravedad: 'aviso', ids: ['c1'], cantidadCm: 40, mensaje: 'Paso estrecho entre la cama y la pared: 40 cm' }])
  })

  it('paso estrecho entre un mueble y un radiador', () => {
    const doc = base()
    doc.estructura.push({ id: 'r1', tipo: 'radiador', pared: 0, posicion: 100, ancho: 80, alto: 60, fondo: 10, alturaSuelo: 20 })
    doc.elementos.push(elemento('armario', 140, 80, 0, {}, {}, 'a1'))
    expect(de(doc, 'pasoEstrecho').filter((x) => x.ids.length === 2)).toEqual([
      { tipo: 'pasoEstrecho', gravedad: 'aviso', ids: ['a1', 'r1'], cantidadCm: 40, mensaje: 'Paso estrecho entre el armario y el radiador: 40 cm' },
    ])
  })

  it('alfombra bajo la cama: sin conflictos', () => {
    const doc = base()
    doc.elementos.push(elemento('cama', 75, 100, 0), elemento('alfombra', 75, 100, 0, { ancho: 100, fondo: 100 }))
    expect(detectarConflictos(doc, catalogoBase)).toEqual([])
  })

  it('tipo desconocido se ignora', () => {
    const doc = base()
    doc.elementos.push(elemento('desconocido', 0, 0, 0))
    expect(() => detectarConflictos(doc, catalogoBase)).not.toThrow()
    expect(detectarConflictos(doc, catalogoBase)).toEqual([])
  })

  it('pared no alineada con los ejes (planta en L)', () => {
    const doc = base()
    doc.estancia.planta = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 200 }, { x: 200, y: 200 }, { x: 200, y: 400 }, { x: 0, y: 400 }]
    doc.aberturas.push({ id: 'p1', tipo: 'puerta', pared: 3, posicion: 50, ancho: 80, alto: 210, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' })
    doc.elementos.push(elemento('comoda', 160, 290, 90, {}, {}, 'm1'))
    const c = de(doc, 'apertura')
    expect(c.length).toBeGreaterThan(0)
    expect(c.every((x) => x.ids[0] === 'p1')).toBe(true)
    const lejos = base()
    lejos.estancia.planta = doc.estancia.planta
    lejos.aberturas = doc.aberturas
    lejos.elementos.push(elemento('comoda', 300, 100, 90, {}, {}, 'm1'))
    expect(de(lejos, 'apertura')).toEqual([])
  })
})
