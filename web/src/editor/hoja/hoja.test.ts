import { describe, expect, it } from 'vitest'
import { catalogoBase, desplazarPoligono, documentoNuevo, elementoNuevo, rectangulo } from '../../nucleo'
import { aPantalla, MARGEN_ENCUADRE_PX } from '../lienzo/vista'
import { filasDeMuebles, marcoDeImpresion, totalAnotado } from './hoja'

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
  it('inodoro con cisterna empotrada: el alto de la taza; lavabo estrecho con dos senos pedidos: uno', () => {
    const doc = documentoNuevo('bano', 250, 200, 250)
    const inodoro = { ...elementoNuevo(catalogoBase.get('inodoro')!, { x: 50, y: 33 }, 'i'), variantes: { cisterna: false } }
    const lavabo = { ...elementoNuevo(catalogoBase.get('lavabo')!, { x: 150, y: 23 }, 'l'), variantes: { senos: 2 } }
    doc.elementos = [inodoro, lavabo]
    const [fi, fl] = filasDeMuebles(doc, catalogoBase)
    expect(fi!.medidas).toBe('38 × 66 × 40 cm')
    expect(fl!.variantes).toContain('Senos: 1')
  })

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

  it('con nombre propio, el tipo va aparte; sin él, null; en uno de tienda, el nombre del producto (su línea lleva el tipo)', () => {
    const doc = documentoNuevo('dormitorio', 400, 300, 250)
    const armario = elementoNuevo(catalogoBase.get('armario')!, { x: 100, y: 50 }, 'a')
    doc.elementos = [
      { ...armario, nombre: 'Armario de Ana' },
      armario,
      { ...armario, id: 't', nombre: 'El de la entrada', origen: { tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX' } },
    ]
    const filas = filasDeMuebles(doc, catalogoBase)
    expect(filas.map((f) => [f.nombre, f.tipo])).toEqual([['Armario de Ana', 'Armario'], ['Armario', null], ['El de la entrada', 'PAX']])
    expect(filas[2]!.tienda?.linea).toContain('Armario')
  })

  it('un tipo que ya no está en el catálogo sale con su id y sus medidas', () => {
    const doc = documentoNuevo('salon', 400, 300, 250)
    doc.elementos = [{ ...elementoNuevo(catalogoBase.get('sofa')!, { x: 100, y: 100 }, 's'), tipo: 'desconocido' }]
    expect(filasDeMuebles(doc, catalogoBase)[0]).toMatchObject({ nombre: 'desconocido', variantes: [], colores: [] })
  })
})

describe('muebles de tienda en la hoja', () => {
  const doc = () => {
    const d = documentoNuevo('dormitorio', 400, 300, 250)
    const armario = elementoNuevo(catalogoBase.get('armario')!, { x: 100, y: 50 }, 'a')
    const cama = elementoNuevo(catalogoBase.get('cama')!, { x: 200, y: 200 }, 'c')
    const mesita = elementoNuevo(catalogoBase.get('mesita')!, { x: 300, y: 200 }, 'm')
    d.elementos = [
      { ...armario, origen: { tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX', referencia: '805.483.84', url: 'https://www.ikea.com/es/es/p/pax/', precio: 199.9, fechaPrecio: '2026-11-03' } },
      { ...cama, origen: { tipo: 'tienda', proveedor: 'Conforama', nombre: 'Cama Nube', precio: 0.2 } },
      mesita,
    ]
    return d
  }

  it('el nombre del producto, y debajo el tipo, la tienda y la referencia, la URL y el precio con su fecha', () => {
    const [pax, nube, mesita] = filasDeMuebles(doc(), catalogoBase)
    expect(pax).toMatchObject({ nombre: 'PAX', tienda: { linea: 'Armario · IKEA · ref. 805.483.84', url: 'https://www.ikea.com/es/es/p/pax/' } })
    expect(pax!.tienda!.precio).toMatch(/^199,90\s€ \(anotado el 03\/11\/2026\)$/)
    expect(nube!.tienda).toMatchObject({ linea: 'Cama · Conforama' })
    expect(nube!.tienda!.url).toBeUndefined()
    expect(mesita!.tienda).toBeNull()
  })

  it('el total suma en céntimos los productos con precio; sin ninguno, null', () => {
    expect(totalAnotado(doc())).toEqual({ importe: 200.1, productos: 2 })
    // 0,1 + 0,2 da 0,30000000000000004 sumando sin más.
    const d = doc()
    d.elementos = d.elementos.map((e, i) => (e.origen.tipo === 'tienda' ? { ...e, origen: { ...e.origen, precio: i === 0 ? 0.1 : 0.2 } } : e))
    expect(totalAnotado(d)).toEqual({ importe: 0.3, productos: 2 })
    expect(totalAnotado(documentoNuevo('salon', 400, 300, 250))).toBeNull()
  })
})

describe('medidas extra en la hoja', () => {
  it('el esquinero con hueco: sus medidas extra en los detalles, antes de las variantes', () => {
    const d = documentoNuevo('dormitorio', 400, 300, 250)
    const e = elementoNuevo(catalogoBase.get('armario-esquinero')!, { x: 55, y: 55 }, 'e')
    d.elementos = [{ ...e, medidasExtra: { profundidadFondo: 58, anchoAla: 58, huecoAncho: 11, huecoFondo: 58 } }]
    expect(filasDeMuebles(d, catalogoBase)[0]!.variantes).toEqual([
      'Profundidad del fondo: 58 cm', 'Ancho del ala: 58 cm', 'Hueco del rincón: 11 × 58 cm', 'Rincón: Izquierda',
    ])
  })
})
