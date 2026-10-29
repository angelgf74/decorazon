import { describe, expect, it } from 'vitest'
import { textos } from '../../textos'
import { documentoNuevo } from '../modelo/crear'
import type { DocumentoDiseno, Elemento, Puerta, Punto, Radiador, Ventana } from '../modelo/documento'
import type { ResultadoEdicion } from './resultado'
import {
  alinearVertice, cambiarLongitudPared, esRectangular, longitudPared, moverVertice, partirPared, quitarVertice, redimensionarRectangulo,
} from './planta'

const puerta = (id: string, pared: number, posicion: number, ancho = 80): Puerta => ({
  id, tipo: 'puerta', pared, posicion, ancho, alto: 210, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro',
})
const ventana = (id: string, pared: number, posicion: number, ancho = 100): Ventana => ({
  id, tipo: 'ventana', pared, posicion, ancho, alto: 120, alturaSuelo: 90, abreHaciaDentro: true,
})
const radiador = (id: string, pared: number, posicion: number, ancho = 60): Radiador => ({
  id, tipo: 'radiador', pared, posicion, ancho, alto: 60, fondo: 10, alturaSuelo: 15,
})
const mueble: Elemento = {
  id: 'cama', tipo: 'cama', posicion: { x: 350, y: 100 }, rotacion: 0, medidas: { ancho: 90, fondo: 190, alto: 50 },
  alturaSuelo: 0, variantes: {}, colores: {}, origen: { tipo: 'generico' },
}

const sala = (): DocumentoDiseno => documentoNuevo('dormitorio', 400, 330, 250)
const conPlanta = (planta: Punto[]): DocumentoDiseno => {
  const d = sala()
  d.estancia.planta = planta
  return d
}
const ele = (): DocumentoDiseno => conPlanta([
  { x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 100 }, { x: 100, y: 150 }, { x: 100, y: 300 }, { x: 0, y: 300 },
])

function documento(r: ResultadoEdicion): DocumentoDiseno {
  if (!r.ok) throw new Error(`se esperaba ok y vino: ${r.motivo}`)
  return r.documento
}
function motivo(r: ResultadoEdicion): string {
  if (r.ok) throw new Error('se esperaba un fallo')
  return r.motivo
}
const extremos = (planta: Punto[], i: number): [Punto, Punto] => [planta[i], planta[(i + 1) % planta.length]]

describe('consultas', () => {
  it('esRectangular y longitudPared', () => {
    expect(esRectangular(sala().estancia.planta)).toBe(true)
    expect(esRectangular(ele().estancia.planta)).toBe(false)
    expect(esRectangular([{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 410, y: 330 }, { x: 0, y: 330 }])).toBe(false)
    expect(longitudPared(sala().estancia.planta, 1)).toBe(330)
    expect(longitudPared(sala().estancia.planta, 3)).toBe(330)
  })
})

describe('redimensionarRectangulo', () => {
  it('conserva planta[0] y no mueve los muebles', () => {
    const doc = sala()
    doc.elementos.push(mueble)
    const r = documento(redimensionarRectangulo(doc, 500, 300))
    expect(r.estancia.planta).toEqual([{ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 500, y: 300 }, { x: 0, y: 300 }])
    expect(r.elementos[0].posicion).toEqual({ x: 350, y: 100 })
    expect(doc.estancia.planta[1]).toEqual({ x: 400, y: 0 })
  })
  it('conserva la orientación de cada pared aunque planta[0] no sea la esquina superior izquierda', () => {
    const doc = conPlanta([{ x: 400, y: 330 }, { x: 0, y: 330 }, { x: 0, y: 0 }, { x: 400, y: 0 }])
    const r = documento(redimensionarRectangulo(doc, 500, 300))
    expect(r.estancia.planta).toEqual([{ x: 400, y: 330 }, { x: -100, y: 330 }, { x: -100, y: 30 }, { x: 400, y: 30 }])
  })
  it('falla si una puerta ya no cabe', () => {
    const doc = sala()
    doc.aberturas.push(puerta('p', 1, 250, 80))
    const antes = JSON.stringify(doc)
    expect(motivo(redimensionarRectangulo(doc, 400, 300))).toBe(textos.edicion.noCabeEnPared)
    expect(JSON.stringify(doc)).toBe(antes)
  })
  it('falla si la estancia no es rectangular', () => {
    expect(motivo(redimensionarRectangulo(ele(), 500, 300))).toBe(textos.edicion.noRectangular)
  })
})

describe('cambiarLongitudPared', () => {
  it('en un rectángulo mueve los vértices 1 y 2', () => {
    const r = documento(cambiarLongitudPared(sala(), 0, 450))
    expect(r.estancia.planta).toEqual([{ x: 0, y: 0 }, { x: 450, y: 0 }, { x: 450, y: 330 }, { x: 0, y: 330 }])
  })
  it('si la pared siguiente no es perpendicular, mueve solo b', () => {
    const doc = ele()
    const r = documento(cambiarLongitudPared(doc, 1, 120))
    expect(r.estancia.planta).toEqual([...doc.estancia.planta.slice(0, 2), { x: 200, y: 120 }, ...doc.estancia.planta.slice(3)])
  })
  it('la última pared mueve planta[0] y, si la siguiente es perpendicular, planta[1]', () => {
    const r = documento(cambiarLongitudPared(sala(), 3, 350))
    expect(r.estancia.planta).toEqual([{ x: 0, y: -20 }, { x: 400, y: -20 }, { x: 400, y: 330 }, { x: 0, y: 330 }])
  })
  it('falla con paredCorta y no muta', () => {
    const doc = sala()
    const antes = JSON.stringify(doc)
    expect(motivo(cambiarLongitudPared(doc, 0, 5))).toBe(textos.edicion.paredCorta)
    expect(JSON.stringify(doc)).toBe(antes)
  })
  it('una puerta que no cabe en la pared acortada la hace fallar', () => {
    const doc = sala()
    doc.aberturas.push(puerta('p', 0, 300, 80))
    expect(motivo(cambiarLongitudPared(doc, 0, 350))).toBe(textos.edicion.noCabeEnPared)
  })
  it('índice o longitud no válidos', () => {
    expect(motivo(cambiarLongitudPared(sala(), 4, 300))).toBe(textos.edicion.cambioNoValido)
    expect(motivo(cambiarLongitudPared(sala(), 0, Number.NaN))).toBe(textos.edicion.cambioNoValido)
  })
})

describe('moverVertice', () => {
  it('a una posición que cruza o degenera la planta falla y no toca el documento', () => {
    const doc = sala()
    const antes = JSON.stringify(doc)
    const r = moverVertice(doc, 2, { x: 0, y: 0 })
    expect(r.ok).toBe(false)
    expect(JSON.stringify(doc)).toBe(antes)
  })
  it('cruzar la planta da plantaCruzada', () => {
    expect(motivo(moverVertice(sala(), 2, { x: -100, y: 100 }))).toBe(textos.edicion.plantaCruzada)
  })
  it('redondea el destino a cm enteros', () => {
    const r = documento(moverVertice(sala(), 2, { x: 400.4, y: 329.6 }))
    expect(r.estancia.planta[2]).toEqual({ x: 400, y: 330 })
  })
  it('una pared de 5 cm da paredCorta', () => {
    const doc = sala()
    const antes = JSON.stringify(doc)
    expect(motivo(moverVertice(doc, 2, { x: 400, y: 5 }))).toBe(textos.edicion.paredCorta)
    expect(JSON.stringify(doc)).toBe(antes)
  })
  it('una puerta que se sale de su pared da noCabeEnPared', () => {
    const doc = sala()
    doc.aberturas.push(puerta('p', 1, 200, 80))
    expect(motivo(moverVertice(doc, 2, { x: 400, y: 250 }))).toBe(textos.edicion.noCabeEnPared)
  })
  it('un radiador que se sale de su pared también falla', () => {
    const doc = sala()
    doc.estructura.push(radiador('r', 1, 250, 60))
    expect(motivo(moverVertice(doc, 2, { x: 400, y: 250 }))).toBe(textos.edicion.noCabeEnPared)
  })
})

describe('alinearVertice', () => {
  const planta = sala().estancia.planta
  it('toma la x o la y del vecino si está a menos del umbral', () => {
    expect(alinearVertice(planta, 2, { x: 397, y: 200 })).toEqual({ x: 400, y: 200 })
    expect(alinearVertice(planta, 2, { x: 300, y: 333 })).toEqual({ x: 300, y: 330 })
    expect(alinearVertice(planta, 2, { x: 404, y: 326 })).toEqual({ x: 400, y: 330 })
  })
  it('no alinea más allá del umbral', () => {
    expect(alinearVertice(planta, 2, { x: 394, y: 200 })).toEqual({ x: 394, y: 200 })
    expect(alinearVertice(planta, 2, { x: 394, y: 200 }, 6)).toEqual({ x: 400, y: 200 })
  })
})

describe('partirPared', () => {
  it('inserta el punto medio como vértice nuevo', () => {
    const r = documento(partirPared(sala(), 0))
    expect(r.estancia.planta).toHaveLength(5)
    expect(r.estancia.planta[1]).toEqual({ x: 200, y: 0 })
  })
  it('redondea el punto medio a cm', () => {
    const r = documento(partirPared(conPlanta([{ x: 0, y: 0 }, { x: 401, y: 0 }, { x: 401, y: 330 }, { x: 0, y: 330 }]), 0))
    expect(r.estancia.planta[1]).toEqual({ x: 201, y: 0 })
  })
  it('reindexa aberturas y radiadores a la misma pared física', () => {
    const doc = sala()
    doc.aberturas.push(puerta('antes', 0, 50), puerta('despues', 0, 250), ventana('v', 2, 100))
    doc.estructura.push(radiador('r', 3, 100))
    const antes = JSON.stringify(doc)
    const r = documento(partirPared(doc, 0))
    const pa = r.aberturas.find(a => a.id === 'antes')!
    const pd = r.aberturas.find(a => a.id === 'despues')!
    const v = r.aberturas.find(a => a.id === 'v')!
    const rad = r.estructura.find(e => e.id === 'r') as Radiador
    expect([pa.pared, pa.posicion]).toEqual([0, 50])
    expect([pd.pared, pd.posicion]).toEqual([1, 50])
    expect(v.pared).toBe(3)
    expect(rad.pared).toBe(4)
    expect(extremos(r.estancia.planta, v.pared)).toEqual(extremos(doc.estancia.planta, 2))
    expect(extremos(r.estancia.planta, rad.pared)).toEqual(extremos(doc.estancia.planta, 3))
    expect(JSON.stringify(doc)).toBe(antes)
  })
  it('partir la última pared añade el vértice al final', () => {
    const doc = sala()
    doc.aberturas.push(puerta('p', 3, 200))
    const r = documento(partirPared(doc, 3))
    expect(r.estancia.planta[4]).toEqual({ x: 0, y: 165 })
    expect([r.aberturas[0].pared, r.aberturas[0].posicion]).toEqual([4, 35])
  })
  it('falla si un hueco cruza el punto medio', () => {
    const doc = sala()
    doc.aberturas.push(puerta('p', 0, 160, 80))
    const antes = JSON.stringify(doc)
    expect(motivo(partirPared(doc, 0))).toBe(textos.edicion.huecoEnMedio)
    expect(JSON.stringify(doc)).toBe(antes)
  })
})

describe('quitarVertice', () => {
  it('sobre la planta partida vuelve al rectángulo', () => {
    const doc = sala()
    doc.aberturas.push(ventana('v', 2, 100))
    const partida = documento(partirPared(doc, 0))
    const r = documento(quitarVertice(partida, 1))
    expect(r.estancia.planta).toEqual(doc.estancia.planta)
    expect(r.aberturas[0].pared).toBe(2)
  })
  it('quitar el vértice 0 del rectángulo deja un triángulo con las aberturas en su misma pared física', () => {
    const doc = sala()
    doc.aberturas.push(puerta('p', 1, 100), ventana('v', 2, 150))
    doc.estructura.push(radiador('r', 2, 20))
    const antes = JSON.stringify(doc)
    const r = documento(quitarVertice(doc, 0))
    expect(r.estancia.planta).toEqual([{ x: 400, y: 0 }, { x: 400, y: 330 }, { x: 0, y: 330 }])
    for (const [id, paredAntes] of [['p', 1], ['v', 2], ['r', 2]] as const) {
      const nueva = [...r.aberturas, ...r.estructura].find(x => x.id === id) as Puerta | Ventana | Radiador
      expect(extremos(r.estancia.planta, nueva.pared)).toEqual(extremos(doc.estancia.planta, paredAntes))
    }
    expect(JSON.stringify(doc)).toBe(antes)
  })
  it('falla si una de las paredes que tocan el vértice está ocupada', () => {
    const conPuerta = sala()
    conPuerta.aberturas.push(puerta('p', 3, 100))
    expect(motivo(quitarVertice(conPuerta, 0))).toBe(textos.edicion.paredOcupada)
    const conRadiador = sala()
    conRadiador.estructura.push(radiador('r', 0, 100))
    expect(motivo(quitarVertice(conRadiador, 0))).toBe(textos.edicion.paredOcupada)
  })
  it('en un triángulo falla', () => {
    const triangulo = conPlanta([{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 0, y: 330 }])
    expect(motivo(quitarVertice(triangulo, 0))).toBe(textos.edicion.minimoVertices)
  })
})
