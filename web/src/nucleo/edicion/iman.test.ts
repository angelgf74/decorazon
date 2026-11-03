import { describe, expect, it } from 'vitest'
import { catalogoBase } from '../catalogo/catalogoBase'
import { elementoNuevo } from '../catalogo/elemento'
import { detectarConflictos } from '../conflictos/detectar'
import { rectangulo } from '../geometria/formas'
import { rotar } from '../geometria/vector'
import { documentoNuevo } from '../modelo/crear'
import type { DocumentoDiseno, Elemento, Punto } from '../modelo/documento'
import { imantar } from './iman'

const sala = (): DocumentoDiseno => documentoNuevo('dormitorio', 400, 330, 250)
const armario = (posicion: Punto, rotacion = 0, id?: string): Elemento =>
  ({ ...elementoNuevo(catalogoBase.get('armario')!, { ...posicion }, id), rotacion })

describe('imantar', () => {
  it('pega a la pared de arriba', () => {
    const r = imantar(sala(), catalogoBase, armario({ x: 200, y: 38 }), { libre: false })
    expect(r.posicion).toEqual({ x: 200, y: 30 })
    expect(r.rotacion).toBe(0)
    expect(r.pegadoA).toContain('pared:0')
  })
  it('encaja en la esquina', () => {
    const r = imantar(sala(), catalogoBase, armario({ x: 56, y: 36 }), { libre: false })
    expect(r.posicion).toEqual({ x: 50, y: 30 })
    expect(r.pegadoA.sort()).toEqual(['pared:0', 'pared:3'])
  })
  it('lejos de las paredes no mueve nada', () => {
    const r = imantar(sala(), catalogoBase, armario({ x: 200, y: 70 }), { libre: false })
    expect(r.posicion).toEqual({ x: 200, y: 70 })
    expect(r.pegadoA).toEqual([])
  })
  it('sin libre redondea el giro a 90', () => {
    expect(imantar(sala(), catalogoBase, armario({ x: 200, y: 165 }, 93), { libre: false }).rotacion).toBe(90)
    expect(imantar(sala(), catalogoBase, armario({ x: 200, y: 165 }, -91), { libre: false }).rotacion).toBe(270)
  })
  it('con libre y lejos de las paredes conserva el giro entero', () => {
    expect(imantar(sala(), catalogoBase, armario({ x: 200, y: 165 }, 93), { libre: true }).rotacion).toBe(93)
    expect(imantar(sala(), catalogoBase, armario({ x: 200, y: 165 }, 92.6), { libre: true }).rotacion).toBe(93)
  })
  it('con libre solo endereza junto a la pared si la diferencia es de 5° o menos', () => {
    const cerca = imantar(sala(), catalogoBase, armario({ x: 200, y: 40 }, 4), { libre: true })
    expect(cerca.rotacion).toBe(0)
    expect(cerca.posicion.y).toBe(30)
    const lejos = imantar(sala(), catalogoBase, armario({ x: 200, y: 50 }, 20), { libre: true })
    expect(lejos.rotacion).toBe(20)
    expect(lejos.pegadoA).toEqual([])
  })
  it('pega un armario a otro a ras', () => {
    const doc = sala()
    const primero = armario({ x: 100, y: 30 }, 0, 'a1')
    doc.elementos.push(primero)
    const r = imantar(doc, catalogoBase, armario({ x: 210, y: 36 }, 0, 'a2'), { libre: false })
    expect(r.posicion).toEqual({ x: primero.posicion.x + 100, y: 30 })
    expect(r.pegadoA.sort()).toEqual(['a1', 'pared:0'])
  })
  it('no se pega a un mueble girado distinto ni a sí mismo', () => {
    const doc = sala()
    const yo = armario({ x: 200, y: 165 }, 0, 'yo')
    doc.elementos.push(armario({ x: 300, y: 165 }, 45, 'otro'), yo)
    const r = imantar(doc, catalogoBase, { ...yo, posicion: { x: 205, y: 165 } }, { libre: false })
    expect(r.posicion).toEqual({ x: 205, y: 165 })
    expect(r.pegadoA).toEqual([])
  })
  it('no muta el elemento ni el documento', () => {
    const doc = sala()
    const e = armario({ x: 200, y: 38 }, 3)
    const antes = JSON.stringify([doc, e])
    imantar(doc, catalogoBase, e, { libre: false })
    expect(JSON.stringify([doc, e])).toBe(antes)
  })

  describe('pared de ángulo no entero (18,43°)', () => {
    const oblicua = (): DocumentoDiseno => {
      const d = sala()
      d.estancia.planta = [{ x: 0, y: 0 }, { x: 300, y: 100 }, { x: 400, y: 100 }, { x: 400, y: 330 }, { x: 0, y: 330 }]
      return d
    }
    // Distancia con signo a la recta de la pared 0, positiva hacia dentro.
    const hueco = (p: Punto) => (-p.x + 3 * p.y) / Math.hypot(1, 3)
    const huecoMinimo = (r: { posicion: Punto; rotacion: number }) => Math.min(...rectangulo(r.posicion, 100, 60, r.rotacion).map(hueco))

    it('gira a grado entero y queda a ras sin entrar en la pared', () => {
      const r = imantar(oblicua(), catalogoBase, armario({ x: 150, y: 90 }, 18), { libre: true })
      expect(r.rotacion).toBe(18)
      expect(r.pegadoA).toEqual(['pared:0'])
      expect(huecoMinimo(r)).toBeGreaterThanOrEqual(-0.01)
      expect(huecoMinimo(r)).toBeLessThan(0.1)
    })
    it('un mueble delante no lo despega de la pared', () => {
      const doc = oblicua()
      const solo = imantar(doc, catalogoBase, armario({ x: 150, y: 90 }, 18, 'a'), { libre: true })
      const delante = rotar({ x: 0, y: 70 }, solo.rotacion)
      doc.elementos.push(armario({ x: solo.posicion.x + delante.x, y: solo.posicion.y + delante.y }, 18, 'b'))
      const r = imantar(doc, catalogoBase, armario({ x: 150, y: 90 }, 18, 'a'), { libre: true })
      expect(r.pegadoA).toEqual(['pared:0'])
      expect(huecoMinimo(r)).toBeLessThan(0.1)
    })
  })

  describe('pared a 45°', () => {
    const pentagono = (): DocumentoDiseno => {
      const d = sala()
      d.estancia.planta = [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 400, y: 100 }, { x: 400, y: 330 }, { x: 0, y: 330 }]
      return d
    }
    const anguloPared = 45
    const mod90 = (g: number) => ((g % 90) + 90) % 90
    const distanciaAngular = (a: number, b: number) => {
      const d = Math.abs(a - b) % 360
      return Math.min(d, 360 - d)
    }
    // Distancia con signo a la recta de la pared 1, positiva hacia dentro.
    const hueco = (p: Punto) => (-(p.x - 300) + p.y) / Math.SQRT2
    const casos: [number, boolean][] = [[0, false], [132, true], [40, true]]

    for (const [giro, libre] of casos) {
      it(`giro ${giro}${libre ? ' libre' : ''}: alinea con la pared, a ras y sin salirse`, () => {
        const doc = pentagono()
        const e = armario({ x: 322, y: 88 }, giro, 'a')
        const r = imantar(doc, catalogoBase, e, { libre })
        expect(mod90(r.rotacion)).toBe(mod90(anguloPared))
        const inicial = libre ? giro : Math.round(giro / 90) * 90
        expect(distanciaAngular(r.rotacion, inicial)).toBeLessThanOrEqual(45)
        const rect = rectangulo(r.posicion, 100, 60, r.rotacion)
        expect(Math.min(...rect.map(hueco))).toBeCloseTo(0, 1)
        expect(r.pegadoA).toContain('pared:1')
        doc.elementos.push({ ...e, posicion: r.posicion, rotacion: r.rotacion })
        expect(detectarConflictos(doc, catalogoBase).filter(c => c.tipo === 'fueraDeEstancia')).toEqual([])
      })
    }
    it('con libre elige el candidato más cercano al giro inicial', () => {
      expect(imantar(pentagono(), catalogoBase, armario({ x: 322, y: 88 }, 132), { libre: true }).rotacion).toBe(135)
      expect(imantar(pentagono(), catalogoBase, armario({ x: 322, y: 88 }, 40), { libre: true }).rotacion).toBe(45)
    })
  })
})

describe('imantar entre muebles: solo los que chocan', () => {
  const de = (tipo: string, posicion: Punto, id: string): Elemento => elementoNuevo(catalogoBase.get(tipo)!, { ...posicion }, id)

  it('un módulo alto soltado sobre un módulo bajo, solapando 10 cm en un borde, no se desplaza', () => {
    const doc = sala()
    doc.elementos.push(de('modulo-bajo', { x: 100, y: 165 }, 'bajo'))
    const r = imantar(doc, catalogoBase, de('modulo-alto', { x: 150, y: 165 }, 'alto'), { libre: false })
    expect(r.posicion).toEqual({ x: 150, y: 165 })
    expect(r.pegadoA).toEqual([])
  })
  it('un mueble junto a una alfombra no se pega a su borde', () => {
    const doc = sala()
    doc.elementos.push(de('alfombra', { x: 200, y: 165 }, 'alfombra'))
    const r = imantar(doc, catalogoBase, armario({ x: 200, y: 273 }, 0, 'a'), { libre: false })
    expect(r.posicion).toEqual({ x: 200, y: 273 })
    expect(r.pegadoA).toEqual([])
  })
  it('ni una alfombra se pega a un mueble', () => {
    const doc = sala()
    doc.elementos.push(armario({ x: 200, y: 273 }, 0, 'a'))
    const r = imantar(doc, catalogoBase, de('alfombra', { x: 200, y: 165 }, 'alfombra'), { libre: false })
    expect(r.posicion).toEqual({ x: 200, y: 165 })
    expect(r.pegadoA).toEqual([])
  })
  it('dos módulos bajos sí se siguen pegando', () => {
    const doc = sala()
    doc.elementos.push(de('modulo-bajo', { x: 100, y: 165 }, 'b1'))
    const r = imantar(doc, catalogoBase, de('modulo-bajo', { x: 168, y: 165 }, 'b2'), { libre: false })
    expect(r.posicion).toEqual({ x: 160, y: 165 })
    expect(r.pegadoA).toEqual(['b1'])
  })
  describe('bajo un tablero', () => {
    const conEscritorio = (): DocumentoDiseno => {
      const doc = documentoNuevo('despacho', 400, 400, 250)
      doc.elementos = [{ ...elementoNuevo(catalogoBase.get('escritorio')!, { x: 200, y: 200 }, 'mesa') }]
      return doc
    }
    const de = (tipo: string, posicion: Punto, rotacion = 0): Elemento =>
      ({ ...elementoNuevo(catalogoBase.get(tipo)!, { ...posicion }, 'x'), rotacion })

    it('una silla metida bajo el escritorio hasta el respaldo se queda donde está', () => {
      // Tablero de y 170 a 230; la silla girada 180° en y=240 tiene el asiento de 215 a 265 y el respaldo fuera.
      expect(imantar(conEscritorio(), catalogoBase, de('silla', { x: 200, y: 240 }, 180), { libre: false }).posicion).toEqual({ x: 200, y: 240 })
      expect(imantar(conEscritorio(), catalogoBase, de('silla-oficina', { x: 200, y: 250 }, 180), { libre: false }).posicion).toEqual({ x: 200, y: 250 })
    })
    it('una cajonera que entra unos centímetros bajo el tablero no sale empujada', () => {
      expect(imantar(conEscritorio(), catalogoBase, de('cajonera', { x: 200, y: 250 }), { libre: false }).posicion).toEqual({ x: 200, y: 250 })
    })
    it('una silla que se acerca sin llegar se sigue pegando al borde', () => {
      // En y=270 el asiento empieza en 245: a 15 cm del tablero; se pega con el asiento en 230.
      const r = imantar(conEscritorio(), catalogoBase, de('silla', { x: 200, y: 270 }, 180), { libre: false })
      expect(r.posicion).toEqual({ x: 200, y: 255 })
      expect(r.pegadoA).toEqual(['mesa'])
    })
  })
})

describe('imantar con columnas y vigas', () => {
  // El caso de Angel: columna de 20 × 20 en el rincón de arriba a la izquierda y un PAX / GRIMO de 111 × 111 con hueco
  // de 12 × 58: la columna no cabe en el hueco, así que el armario va a 8 cm de la pared izquierda, tocando la columna.
  const conColumna = (columnas: { x: number; y: number; ancho: number; fondo: number }[]): DocumentoDiseno => ({
    ...sala(),
    estructura: columnas.map((c, i) => ({ id: 'col' + i, tipo: 'columna' as const, centro: { x: c.x, y: c.y }, ancho: c.ancho, fondo: c.fondo, rotacion: 0 })),
  })
  const pax = (posicion: Punto, huecoAncho = 12): Elemento => ({
    ...elementoNuevo(catalogoBase.get('armario-esquinero')!, { ...posicion }, 'pax'),
    medidas: { ancho: 111, fondo: 111, alto: 201 },
    medidasExtra: { profundidadFondo: 58, anchoAla: 58, huecoAncho, huecoFondo: 58 },
  })
  const conflictos = (doc: DocumentoDiseno, e: Elemento, r: { posicion: Punto; rotacion: number }) =>
    detectarConflictos({ ...doc, elementos: [{ ...e, posicion: r.posicion, rotacion: r.rotacion }] }, catalogoBase)

  it('soltado cerca del rincón: pegado a la pared de atrás y apoyado en la columna, a 8 cm de la izquierda', () => {
    const doc = conColumna([{ x: 10, y: 10, ancho: 20, fondo: 20 }])
    const e = pax({ x: 58, y: 58 })
    const r = imantar(doc, catalogoBase, e, { libre: false })
    expect(r.posicion).toEqual({ x: 63.5, y: 55.5 })
    expect(r.pegadoA).toContain('estructura:col0')
    // Se apartó de la pared izquierda: ya no está pegado a ella.
    expect(r.pegadoA.filter((p) => p.startsWith('pared:'))).toEqual(['pared:0'])
    expect(conflictos(doc, e, r)).toEqual([])
  })

  it('soltado a 20 cm de la pared: se acerca hasta tocar la columna', () => {
    const doc = conColumna([{ x: 10, y: 10, ancho: 20, fondo: 20 }])
    const r = imantar(doc, catalogoBase, pax({ x: 75.5, y: 58 }), { libre: false })
    expect(r.posicion).toEqual({ x: 63.5, y: 55.5 })
  })

  it('la atracción llega a 15 cm justos: a 15 se acerca, a 16 no', () => {
    const doc = conColumna([{ x: 10, y: 10, ancho: 20, fondo: 20 }])
    // A 23 cm de la pared, el cuerpo del fondo empieza en 35: 15 cm hasta la columna; a 24, 16.
    expect(imantar(doc, catalogoBase, pax({ x: 78.5, y: 58 }), { libre: false }).posicion).toEqual({ x: 63.5, y: 55.5 })
    expect(imantar(doc, catalogoBase, pax({ x: 79.5, y: 58 }), { libre: false }).posicion).toEqual({ x: 79.5, y: 55.5 })
  })

  it('si la columna cabe en el hueco, se queda pegado a las dos paredes', () => {
    const doc = conColumna([{ x: 10, y: 10, ancho: 20, fondo: 20 }])
    const r = imantar(doc, catalogoBase, pax({ x: 58, y: 58 }, 20), { libre: false })
    expect(r.posicion).toEqual({ x: 55.5, y: 55.5 })
    expect(r.pegadoA).not.toContain('estructura:col0')
  })

  it('un armario contra una columna en medio de la pared se aparta lo justo para tocarla', () => {
    const doc = conColumna([{ x: 200, y: 15, ancho: 30, fondo: 30 }])
    const r = imantar(doc, catalogoBase, armario({ x: 145, y: 35 }), { libre: false })
    expect(r.posicion).toEqual({ x: 135, y: 30 })
  })

  it('con un solape de más de 15 cm no se mueve: queda el aviso de siempre', () => {
    const doc = conColumna([{ x: 200, y: 15, ancho: 30, fondo: 30 }])
    const r = imantar(doc, catalogoBase, armario({ x: 170, y: 35 }), { libre: false })
    expect(r.posicion).toEqual({ x: 170, y: 30 })
  })

  it('no se aparta hacia fuera de la estancia', () => {
    // Armario en el rincón (x de 0 a 100) y una columna que lo pisa 5 cm por la derecha: a la izquierda está la pared.
    const doc = conColumna([{ x: 105, y: 15, ancho: 20, fondo: 20 }])
    const r = imantar(doc, catalogoBase, armario({ x: 56, y: 36 }), { libre: false })
    expect(r.posicion).toEqual({ x: 50, y: 30 })
  })

  it('no se aparta contra otra columna', () => {
    // Dos columnas con 95 cm libres entre sus caras (de 115 a 210): el armario de 100 no cabe entre ellas.
    const doc = conColumna([{ x: 100, y: 15, ancho: 30, fondo: 30 }, { x: 225, y: 15, ancho: 30, fondo: 30 }])
    const r = imantar(doc, catalogoBase, armario({ x: 170, y: 35 }), { libre: false })
    expect(r.posicion).toEqual({ x: 170, y: 30 })
  })

  it('una viga baja aparta un armario alto de la pared; uno que cabe debajo, no', () => {
    // Viga de 12 de ancho contra la pared de atrás, con su cara de abajo a 220 cm (canto 30 en un techo de 250).
    const doc: DocumentoDiseno = { ...sala(), estructura: [{ id: 'v', tipo: 'viga', desde: { x: 0, y: 6 }, hasta: { x: 400, y: 6 }, ancho: 12, canto: 30 }] }
    const alto = { ...armario({ x: 200, y: 35 }), medidas: { ancho: 100, fondo: 60, alto: 230 } }
    const r = imantar(doc, catalogoBase, alto, { libre: false })
    expect(r.posicion).toEqual({ x: 200, y: 42 })
    expect(r.pegadoA).toContain('estructura:v')
    expect(imantar(doc, catalogoBase, armario({ x: 200, y: 35 }), { libre: false }).posicion).toEqual({ x: 200, y: 30 })
  })
})

describe('imantar con estructura: lo que no debe hacer', () => {
  it('no aparta un mueble de la columna metiéndolo en su vecino', () => {
    // B en el rincón (x de 0 a 100); A pegado a su derecha (100 a 200) y una columna que pisa A 5 cm por la derecha.
    const doc: DocumentoDiseno = { ...sala(), estructura: [{ id: 'c', tipo: 'columna', centro: { x: 205, y: 10 }, ancho: 20, fondo: 20, rotacion: 0 }] }
    doc.elementos = [armario({ x: 50, y: 30 }, 0, 'B')]
    const r = imantar(doc, catalogoBase, armario({ x: 152, y: 35 }, 0, 'A'), { libre: false })
    expect(r.posicion).toEqual({ x: 150, y: 30 })
    expect(r.pegadoA).not.toContain('estructura:c')
  })

  it('al editar con las paredes de antes (cambiar el alto), no lo atrae una columna que solo tenía cerca', () => {
    const doc: DocumentoDiseno = { ...sala(), estructura: [{ id: 'c', tipo: 'columna', centro: { x: 265, y: 10 }, ancho: 20, fondo: 20, rotacion: 0 }] }
    const e = { ...armario({ x: 200, y: 30 }), medidas: { ancho: 100, fondo: 60, alto: 230 } }
    expect(imantar(doc, catalogoBase, e, { libre: false, paredes: [0] }).posicion).toEqual({ x: 200, y: 30 })
  })

  it('una alfombra no se atrae a una columna', () => {
    const doc: DocumentoDiseno = { ...sala(), estructura: [{ id: 'c', tipo: 'columna', centro: { x: 200, y: 165 }, ancho: 20, fondo: 20, rotacion: 0 }] }
    const alfombra = elementoNuevo(catalogoBase.get('alfombra')!, { x: 0, y: 0 }, 'alf')
    // Su borde derecho a 10 cm de la columna (que empieza en x = 190).
    const e = { ...alfombra, posicion: { x: 180 - alfombra.medidas.ancho / 2, y: 165 } }
    expect(imantar(doc, catalogoBase, e, { libre: false }).posicion).toEqual(e.posicion)
  })

  it('un cuadro colgado bajo una viga no se separa de la pared: se queda con su aviso', () => {
    // Viga contra la pared de atrás con su cara de abajo a 190; el cuadro llega de 160 a 220.
    const doc: DocumentoDiseno = { ...sala(), estructura: [{ id: 'v', tipo: 'viga', desde: { x: 0, y: 6 }, hasta: { x: 400, y: 6 }, ancho: 12, canto: 60 }] }
    const cuadro = { ...elementoNuevo(catalogoBase.get('cuadro')!, { x: 200, y: 4 }, 'cu'), alturaSuelo: 160, medidas: { ancho: 60, fondo: 3, alto: 60 } }
    expect(imantar(doc, catalogoBase, cuadro, { libre: false }).posicion).toEqual({ x: 200, y: 1.5 })
  })
})

