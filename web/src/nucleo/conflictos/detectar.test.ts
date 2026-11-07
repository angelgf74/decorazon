import { describe, expect, it } from 'vitest'
import { documentoNuevo } from '../modelo/crear'
import type { DocumentoDiseno } from '../modelo/documento'
import { validarDocumento } from '../modelo/validar'
import { catalogoBase } from '../catalogo/catalogoBase'
import { elemento } from '../catalogo/definiciones/ayuda.test-util'
import { interseccionConvexos } from '../geometria/convexo'
import { rectangulo } from '../geometria/formas'
import { areaConSigno } from '../geometria/poligono'
import { detectarConflictos, HUECO_IGNORADO_CM, PASO_MINIMO_CM } from './detectar'
import type { TipoConflicto } from './tipos'

const base = () => documentoNuevo('dormitorio', 400, 330, 250)
const de = (doc: DocumentoDiseno, tipo: TipoConflicto) => detectarConflictos(doc, catalogoBase).filter((c) => c.tipo === tipo)
const mensajes = (doc: DocumentoDiseno, tipo: TipoConflicto) => de(doc, tipo).map((c) => c.mensaje)

describe('detectarConflictos', () => {
  it('constantes de paso', () => {
    expect(PASO_MINIMO_CM).toBe(60)
    expect(HUECO_IGNORADO_CM).toBe(30)
  })

  describe('zona del conflicto', () => {
    it('solape de armario y cama 12 cm: la zona es la intersección de las huellas', () => {
      // Armario x 50..150, y 0..60; cama x 138..288, y 0..200 -> 12 × 60.
      const doc = base()
      doc.elementos.push(elemento('armario', 100, 30, 0, {}, {}, 'a1'), elemento('cama', 213, 100, 0, {}, {}, 'c1'))
      const c = de(doc, 'solape')
      expect(c).toHaveLength(1)
      expect(c[0].zona).toBeDefined()
      expect(areaConSigno(c[0].zona!)).toBeCloseTo(12 * 60, 6)
    })
    it('armario girado que atraviesa la pared: la zona es su huella y el hueco, la parte que queda dentro', () => {
      const doc = base()
      const a = elemento('armario', 20, 20, 30, {}, {}, 'a1')
      doc.elementos.push(a)
      const c = de(doc, 'fueraDeEstancia')
      expect(c).toHaveLength(1)
      const huella = catalogoBase.get('armario')!.volumenes(a)[0].huella
      const area = areaConSigno(huella)
      expect(areaConSigno(c[0].zona!)).toBeCloseTo(area, 6)
      expect(c[0].huecoDeZona).toBeDefined()
      // Lo que sale: fuera por la izquierda (x < 0) o por arriba (y < 0), sin contar dos veces la esquina.
      const parte = (x: number, y: number) => areaConSigno(interseccionConvexos(huella, rectangulo({ x, y }, 10000, 10000, 0)))
      const sale = parte(-5000, 0) + parte(0, -5000) - parte(-5000, -5000)
      expect(sale).toBeGreaterThan(1)
      expect(areaConSigno(c[0].huecoDeZona!) + sale).toBeCloseTo(area, 6)
    })
    it('un mueble entero fuera no tiene hueco', () => {
      const doc = base()
      doc.elementos.push(elemento('armario', -200, -200, 0, {}, {}, 'a1'))
      const c = de(doc, 'fueraDeEstancia')
      expect(c).toHaveLength(1)
      expect(c[0].zona).toBeDefined()
      expect(c[0].huecoDeZona).toBeUndefined()
    })
    it('apertura contra la pared: la zona es la huella entera de la zona de apertura', () => {
      const doc = base()
      const m = elemento('comoda', 200, 55, 180, {}, {}, 'm1')
      doc.elementos.push(m)
      const c = de(doc, 'apertura')
      expect(c).toHaveLength(1)
      const huella = catalogoBase.get('comoda')!.zonasApertura(m)[0].huella
      expect(areaConSigno(c[0].zona!)).toBeCloseTo(areaConSigno(huella), 6)
    })
    it('paso estrecho: sin zona', () => {
      const doc = base()
      doc.elementos.push(elemento('cama', 75, 100, 0), elemento('armario', 245, 100, 0))
      const c = de(doc, 'pasoEstrecho')
      expect(c.length).toBeGreaterThan(0)
      for (const x of c) expect(x.zona).toBeUndefined()
    })
  })

  it('1. armario bajo una viga', () => {
    const doc = base()
    doc.estructura.push({ id: 'v1', tipo: 'viga', desde: { x: 0, y: 150 }, hasta: { x: 400, y: 150 }, ancho: 20, canto: 20 })
    doc.elementos.push(elemento('armario', 200, 150, 0, { alto: 240 }, {}, 'a1'))
    expect(de(doc, 'viga')).toMatchObject([{ tipo: 'viga', gravedad: 'error', ids: ['a1', 'v1'], cantidadCm: 10, mensaje: 'El armario no cabe bajo la viga: sobran 10 cm' }])
    expect(de(doc, 'solape')).toEqual([])
  })

  it('2. puerta del armario contra la cama', () => {
    const doc = base()
    doc.elementos.push(elemento('armario', 100, 30, 0, {}, {}, 'a1'), elemento('cama', 100, 198, 0, {}, {}, 'c1'))
    const c = de(doc, 'apertura').filter((x) => x.ids[0] === 'a1')
    expect(c).toMatchObject([{ gravedad: 'error', ids: ['a1', 'c1'], cantidadCm: 12, mensaje: 'La puerta del armario choca con la cama: faltan 12 cm' }])
  })

  it('las dos hojas de un armario contra una columna o contra la pared dan un solo aviso', () => {
    const conColumna = base()
    conColumna.estructura.push({ id: 'col', tipo: 'columna', centro: { x: 100, y: 90 }, ancho: 100, fondo: 20, rotacion: 0 })
    conColumna.elementos.push(elemento('armario', 100, 30, 0, {}, {}, 'a1'))
    expect(de(conColumna, 'apertura').map((c) => c.ids)).toEqual([['a1', 'col']])
    const contraPared = base()
    contraPared.elementos.push(elemento('armario', 200, 60, 180, {}, {}, 'a1'))
    expect(de(contraPared, 'apertura')).toMatchObject([{ ids: ['a1'], cantidadCm: 20, mensaje: 'La puerta del armario choca con la pared: faltan 20 cm' }])
  })

  it('3. cómoda girada 180° con el frente a 30 cm de la pared', () => {
    const doc = base()
    doc.elementos.push(elemento('comoda', 200, 55, 180, {}, {}, 'm1'))
    expect(de(doc, 'apertura')).toMatchObject([{ tipo: 'apertura', gravedad: 'error', ids: ['m1'], cantidadCm: 15, mensaje: 'El cajón de la cómoda choca con la pared: faltan 15 cm' }])
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

  it('puerta corredera con un armario a 15 cm delante: el hueco necesita 60 cm de paso', () => {
    // Hueco x 20..100; franja de paso x 20..100, y 0..60. Armario 100×60 en (60, 45): x 10..110, y 15..75.
    // Eje y: min(60 - 15, 75 - 0) = 45; eje x: min(100 - 10, 110 - 20) = 90 -> 45 -> ceil(45 - 0.1) = 45.
    const doc = base()
    doc.aberturas.push({ id: 'p1', tipo: 'puerta', pared: 0, posicion: 20, ancho: 80, alto: 210, hoja: 'corredera', bisagra: 'izquierda', abreHacia: 'dentro' })
    doc.elementos.push(elemento('armario', 60, 45, 0, {}, {}, 'a1'))
    expect(de(doc, 'apertura')).toMatchObject([{ tipo: 'apertura', gravedad: 'error', ids: ['p1', 'a1'], cantidadCm: 45, mensaje: 'La puerta choca con el armario: faltan 45 cm' }])
  })

  it('puerta abatible hacia fuera: también deja 60 cm de paso', () => {
    const doc = base()
    doc.aberturas.push({ id: 'p1', tipo: 'puerta', pared: 0, posicion: 20, ancho: 80, alto: 210, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'fuera' })
    doc.elementos.push(elemento('armario', 60, 45, 0, {}, {}, 'a1'))
    expect(mensajes(doc, 'apertura')).toEqual(['La puerta choca con el armario: faltan 45 cm'])
  })

  it('5. cama que atraviesa una columna', () => {
    const doc = base()
    doc.estructura.push({ id: 'k1', tipo: 'columna', centro: { x: 162, y: 100 }, ancho: 40, fondo: 40, rotacion: 0 })
    doc.elementos.push(elemento('cama', 75, 100, 0, {}, {}, 'c1'))
    expect(de(doc, 'solape')).toMatchObject([{ tipo: 'solape', gravedad: 'error', ids: ['c1', 'k1'], cantidadCm: 8, mensaje: 'La cama y la columna se solapan 8 cm' }])
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
    expect(de(b, 'fueraDeEstancia')).toMatchObject([{ tipo: 'fueraDeEstancia', gravedad: 'error', ids: ['c1'], cantidadCm: 3, mensaje: 'La cama atraviesa la pared: sobran 3 cm' }])
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
    expect(c).toMatchObject([{ tipo: 'apertura', gravedad: 'error', ids: ['p1', 'a1'], cantidadCm: 22, mensaje: 'La puerta choca con el armario: faltan 22 cm' }])
  })

  it('armario más alto que el techo', () => {
    const doc = base()
    doc.elementos.push(elemento('armario', 200, 165, 0, { alto: 260 }, {}, 'a1'))
    expect(de(doc, 'techo')).toMatchObject([{ tipo: 'techo', gravedad: 'error', ids: ['a1'], cantidadCm: 10, mensaje: 'El armario no cabe bajo el techo: sobran 10 cm' }])
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

  it('un hueco de menos de 30 cm no es un paso: no se avisa; de 30, sí', () => {
    // Armario 100 × 60 centrado en x: solo queda cerca la pared de arriba.
    const a = base()
    a.elementos.push(elemento('armario', 200, 25 + 30, 0))
    expect(mensajes(a, 'pasoEstrecho')).toEqual([])
    const b = base()
    b.elementos.push(elemento('armario', 200, 30 + 30, 0))
    expect(mensajes(b, 'pasoEstrecho')).toEqual(['Paso estrecho entre el armario y la pared: 30 cm'])
  })

  it('sofá, sillón y mesa de centro se usan juntos: entre ellos no hay paso estrecho', () => {
    // Sofá 200 × 90 en x 150..350, y 55..145; mesa de centro a 40 cm (lo recomendado) en y 185..245; sillón (80 de ancho) a 25 cm a la izquierda.
    const doc = documentoNuevo('salon', 500, 330, 250)
    doc.elementos.push(elemento('sofa', 250, 100, 0), elemento('mesa-centro', 250, 215, 0), elemento('sillon', 150 - 25 - 40, 100, 0))
    expect(mensajes(doc, 'pasoEstrecho').filter((m) => !m.includes('pared'))).toEqual([])
  })

  it('el conjunto de estar no exime frente a otros muebles: sofá y armario a 40 cm sí avisan', () => {
    const doc = documentoNuevo('salon', 400, 330, 250)
    doc.elementos.push(elemento('sofa', 200, 100, 0), elemento('armario', 200, 215, 0))
    expect(mensajes(doc, 'pasoEstrecho')).toContain('Paso estrecho entre el sofá y el armario: 40 cm')
  })

  describe('un hueco que llena otro mueble no es un paso', () => {
    const cocina = () => documentoNuevo('cocina', 400, 300, 250)
    // Módulos bajos de fondo 60 contra la pared de arriba (y 0..60).
    const modulo = (x: number, ancho: number, id: string) => elemento('modulo-bajo', x + ancho / 2, 30, 0, { ancho }, {}, id)

    it('tres módulos seguidos con uno de 50 en medio: los de los lados no avisan entre sí', () => {
      const doc = cocina()
      doc.elementos.push(modulo(100, 60, 'm1'), modulo(160, 50, 'm2'), modulo(210, 60, 'm3'))
      expect(mensajes(doc, 'pasoEstrecho')).toEqual([])
    })

    it('un módulo de 50 entre el frigorífico y la pared: no avisa', () => {
      const doc = cocina()
      doc.elementos.push(modulo(0, 50, 'm1'), elemento('frigorifico', 50 + 30, 33, 0, {}, {}, 'f1'))
      expect(mensajes(doc, 'pasoEstrecho')).toEqual([])
    })

    it('si lo de en medio no toca los dos lados, el hueco sigue siendo estrecho', () => {
      // m1 en 100..160 y m3 en 210..270: 50 libres; m2 (20 de ancho) pegado solo a m1, deja 30 hasta m3.
      const doc = cocina()
      doc.elementos.push(modulo(100, 60, 'm1'), modulo(160, 20, 'm2'), modulo(210, 60, 'm3'))
      expect(mensajes(doc, 'pasoEstrecho')).toEqual(expect.arrayContaining([
        'Paso estrecho entre el módulo bajo y el módulo bajo: 50 cm',
        'Paso estrecho entre el módulo bajo y el módulo bajo: 30 cm',
      ]))
    })
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
    expect(c).toMatchObject([{ tipo: 'pasoEstrecho', gravedad: 'aviso', ids: ['c1', 'pared:3'], cantidadCm: 40, mensaje: 'Paso estrecho entre la cama y la pared: 40 cm' }])
  })

  it('paso estrecho contra dos tramos de pared: ids distintos por tramo', () => {
    // Armario 100×60 en (90, 70): x 40..140, y 40..100 -> 40 cm a la pared 0 (arriba) y a la 3 (izquierda).
    const doc = base()
    doc.elementos.push(elemento('armario', 90, 70, 0, {}, {}, 'a1'))
    expect(de(doc, 'pasoEstrecho')).toEqual([
      { tipo: 'pasoEstrecho', gravedad: 'aviso', ids: ['a1', 'pared:0'], cantidadCm: 40, mensaje: 'Paso estrecho entre el armario y la pared: 40 cm' },
      { tipo: 'pasoEstrecho', gravedad: 'aviso', ids: ['a1', 'pared:3'], cantidadCm: 40, mensaje: 'Paso estrecho entre el armario y la pared: 40 cm' },
    ])
  })

  it('paso estrecho entre un mueble y un radiador', () => {
    const doc = base()
    doc.estructura.push({ id: 'r1', tipo: 'radiador', pared: 0, posicion: 100, ancho: 80, alto: 60, fondo: 10, alturaSuelo: 20 })
    doc.elementos.push(elemento('armario', 140, 80, 0, {}, {}, 'a1'))
    expect(de(doc, 'pasoEstrecho').filter((x) => x.ids[1] === 'r1')).toEqual([
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

  describe('tabique que entra desde la pared inferior (x 190..210, hasta y = 100)', () => {
    const conTabique = () => {
      const doc = base()
      doc.estancia.planta = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 300 }, { x: 210, y: 300 }, { x: 210, y: 100 }, { x: 190, y: 100 }, { x: 190, y: 300 }, { x: 0, y: 300 }]
      return doc
    }
    it('la planta con tabique es válida', () => {
      expect(validarDocumento(conTabique())).toMatchObject({ valido: true })
    })
    it('cama por defecto centrada sobre el tabique: atraviesa la pared', () => {
      // Cama x 125..275, y 100..300: las rectas x = 190 y x = 210 la cortan; min(65, 85) = 65 -> 65 cm.
      const doc = conTabique()
      doc.elementos.push(elemento('cama', 200, 200, 0, {}, {}, 'c1'))
      expect(de(doc, 'fueraDeEstancia')).toMatchObject([{ tipo: 'fueraDeEstancia', gravedad: 'error', ids: ['c1'], cantidadCm: 65, mensaje: 'La cama atraviesa la pared: sobran 65 cm' }])
    })
    it('cómoda cuya zona de cajones cruza el tabique: el cajón choca con la pared', () => {
      // Cómoda girada 270° (frente hacia +x) en (165, 200): cuerpo x 140..190, cajones x 190..235, y 150..250.
      // x = 190 es borde de la zona (0); x = 210 la corta: min(20, 25) = 20 -> 20 cm.
      const doc = conTabique()
      doc.elementos.push(elemento('comoda', 165, 200, 270, {}, {}, 'm1'))
      expect(de(doc, 'fueraDeEstancia')).toEqual([])
      expect(de(doc, 'apertura')).toMatchObject([{ tipo: 'apertura', gravedad: 'error', ids: ['m1'], cantidadCm: 20, mensaje: 'El cajón de la cómoda choca con la pared: faltan 20 cm' }])
    })
  })
})
