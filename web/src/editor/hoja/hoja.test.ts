import { describe, expect, it } from 'vitest'
import { catalogoBase, desplazarPoligono, documentoNuevo, elementoNuevo, rectangulo } from '../../nucleo'
import { aPantalla, MARGEN_ENCUADRE_PX } from '../lienzo/vista'
import { filasDeMuebles, marcoDeImpresion } from './hoja'

describe('marcoDeImpresion', () => {
  it('una estancia apaisada ocupa el ancho de la hoja y el alto se ajusta a ella', () => {
    const planta = rectangulo({ x: 200, y: 100 }, 400, 200, 0)
    const m = marcoDeImpresion(planta, 10, 680, 600)
    expect(m.ancho).toBe(680)
    // 420 cm de muro a muro por fuera en 680 − 2·64 px.
    expect(m.vista.escala).toBeCloseTo(552 / 420)
    expect(m.alto).toBeCloseTo(220 * m.vista.escala + 2 * MARGEN_ENCUADRE_PX)
    const esquina = aPantalla(m.vista, desplazarPoligono(planta, 10)[0]!)
    expect(Math.min(esquina.x, m.ancho - esquina.x)).toBeCloseTo(MARGEN_ENCUADRE_PX)
  })

  it('una estancia muy alargada no pasa del alto máximo', () => {
    const m = marcoDeImpresion(rectangulo({ x: 100, y: 500 }, 200, 1000, 0), 10, 680, 600)
    expect(m.alto).toBeCloseTo(600)
    expect(m.vista.escala).toBeCloseTo((600 - 2 * MARGEN_ENCUADRE_PX) / 1020)
  })
})

describe('filasDeMuebles', () => {
  it('nombre, medidas, altura al suelo, variantes y colores de cada mueble, en el orden del diseño', () => {
    const doc = documentoNuevo('cocina', 400, 300, 250)
    const armario = { ...elementoNuevo(catalogoBase.get('armario')!, { x: 100, y: 50 }, 'a'), variantes: { puertas: 'correderas', modulos: 2 } }
    const fregadero = elementoNuevo(catalogoBase.get('fregadero')!, { x: 300, y: 50 }, 'f')
    const cama = { ...elementoNuevo(catalogoBase.get('cama')!, { x: 200, y: 200 }, 'c'), variantes: { cabecero: false } }
    doc.elementos = [armario, fregadero, cama]
    const filas = filasDeMuebles(doc, catalogoBase)
    expect(filas.map((f) => f.nombre)).toEqual(['Armario', 'Fregadero', 'Cama'])
    expect(filas[0]).toMatchObject({
      medidas: `${armario.medidas.ancho} × ${armario.medidas.fondo} × ${armario.medidas.alto} cm`,
      alturaSuelo: null,
      variantes: ['Puertas: Correderas', 'Módulos: 2'],
    })
    expect(filas[0]!.colores.length).toBe(catalogoBase.get('armario')!.zonasColor.length)
    expect(filas[0]!.colores[0]).toEqual({ etiqueta: catalogoBase.get('armario')!.zonasColor[0]!.etiqueta, color: catalogoBase.get('armario')!.zonasColor[0]!.defecto })
    expect(filas[1]!.alturaSuelo).toBe('A 85 cm del suelo')
    expect(filas[2]!.variantes).toEqual(['Cabecero: No'])
  })

  it('un tipo que ya no está en el catálogo sale con su id y sus medidas', () => {
    const doc = documentoNuevo('salon', 400, 300, 250)
    doc.elementos = [{ ...elementoNuevo(catalogoBase.get('sofa')!, { x: 100, y: 100 }, 's'), tipo: 'desconocido' }]
    expect(filasDeMuebles(doc, catalogoBase)[0]).toMatchObject({ nombre: 'desconocido', variantes: [], colores: [] })
  })
})
