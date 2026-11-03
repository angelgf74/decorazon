import { describe, expect, it } from 'vitest'
import { documentoNuevo } from './crear'
import { validarDocumento } from './validar'
import type { DocumentoDiseno, Elemento } from './documento'

const elemento = (id: string, extra: Partial<Elemento> = {}): Elemento => ({
  id, tipo: 'cama', posicion: { x: 100, y: 100 }, rotacion: 0,
  medidas: { ancho: 150, fondo: 200, alto: 40 }, alturaSuelo: 0,
  variantes: {}, colores: {}, origen: { tipo: 'generico' }, ...extra,
})

const base = (): DocumentoDiseno => documentoNuevo('dormitorio', 400, 330, 250)

function errores(dato: unknown): string[] {
  const r = validarDocumento(dato)
  if (r.valido) throw new Error('se esperaba inválido')
  return r.errores
}

describe('validarDocumento', () => {
  it('un despacho es válido', () => {
    expect(validarDocumento(documentoNuevo('despacho', 400, 330, 250))).toMatchObject({ valido: true })
  })
  it('un baño es válido', () => {
    expect(validarDocumento(documentoNuevo('bano', 250, 200, 250))).toMatchObject({ valido: true })
  })
  it('null no lanza y es inválido', () => {
    expect(validarDocumento(null)).toMatchObject({ valido: false })
  })
  it('formato distinto de 1', () => {
    const d = { ...base(), formato: 2 }
    expect(errores(d).some((e) => e.includes('formato'))).toBe(true)
  })
  it('medidas negativas o decimales', () => {
    for (const ancho of [-5, 10.5]) {
      const d = { ...base(), elementos: [elemento('a', { medidas: { ancho, fondo: 200, alto: 40 } })] }
      expect(errores(d).some((e) => e.includes('elementos[0].medidas.ancho'))).toBe(true)
    }
  })
  it('ids repetidos', () => {
    const d = { ...base(), elementos: [elemento('a'), elemento('a')] }
    expect(errores(d).some((e) => e.includes('id repetido'))).toBe(true)
  })
  const puerta = (pared: number, posicion: number, ancho: number) => ({
    id: 'p', tipo: 'puerta', pared, posicion, ancho, alto: 200,
    hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro',
  })
  it('pared fuera de rango', () => {
    const d = { ...base(), aberturas: [puerta(7, 10, 80)] }
    expect(errores(d).some((e) => e.includes('aberturas[0].pared'))).toBe(true)
  })
  it('hueco más largo que la pared', () => {
    const d = { ...base(), aberturas: [puerta(0, 350, 80)] }
    expect(errores(d).some((e) => e.includes('aberturas[0].posicion'))).toBe(true)
  })
  it('planta en pajarita: error de planta', () => {
    const d = base()
    d.estancia.planta = [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 100, y: 0 }, { x: 0, y: 100 }]
    expect(errores(d).some((e) => e.includes('planta'))).toBe(true)
  })
  it('planta en sentido antihorario: error', () => {
    const d = base()
    d.estancia.planta = [...d.estancia.planta].reverse()
    expect(errores(d).some((e) => e.includes('planta') && e.includes('horario'))).toBe(true)
  })
  it('planta de 2 vértices con una puerta: sin errores en cascada de pared', () => {
    const d = { ...base(), aberturas: [puerta(5, 10, 80)] }
    d.estancia.planta = [{ x: 0, y: 0 }, { x: 100, y: 0 }]
    const e = errores(d)
    expect(e.some((m) => m.includes('planta'))).toBe(true)
    expect(e.some((m) => m.includes('aberturas[0].pared'))).toBe(false)
    expect(e.some((m) => m.includes('aberturas[0].posicion'))).toBe(false)
  })
  it('variantes numéricas NaN o Infinity', () => {
    for (const x of [NaN, Infinity]) {
      const d = { ...base(), elementos: [elemento('a', { variantes: { k: x } })] }
      expect(errores(d).some((e) => e.includes('elementos[0].variantes.k'))).toBe(true)
    }
  })
  it('documento completo válido', () => {
    const d = {
      ...base(),
      aberturas: [
        puerta(0, 10, 80),
        { id: 'v', tipo: 'ventana', pared: 1, posicion: 50, ancho: 120, alto: 120, alturaSuelo: 90, abreHaciaDentro: true },
      ],
      estructura: [
        { id: 'c', tipo: 'columna', centro: { x: 200, y: 150 }, ancho: 30, fondo: 30, rotacion: 0 },
        { id: 'vg', tipo: 'viga', desde: { x: 0, y: 100 }, hasta: { x: 400, y: 100 }, ancho: 20, canto: 30 },
        { id: 'r', tipo: 'radiador', pared: 2, posicion: 100, ancho: 80, alto: 60, fondo: 10, alturaSuelo: 15 },
      ],
      elementos: [elemento('e1')],
    }
    expect(validarDocumento(d)).toMatchObject({ valido: true })
  })
})

describe('validarDocumento: origen de tienda', () => {
  const conOrigen = (origen: unknown) => ({ ...base(), elementos: [elemento('e1', { origen: origen as Elemento['origen'] })] })
  const completo = {
    tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX', referencia: '805.483.84',
    url: 'https://www.ikea.com/es/es/p/pax-80548384/', precio: 199.99, fechaPrecio: '2026-11-03',
  }

  it('completo es válido, y también solo con tienda y nombre', () => {
    expect(validarDocumento(conOrigen(completo))).toMatchObject({ valido: true })
    expect(validarDocumento(conOrigen({ tipo: 'tienda', proveedor: 'IKEA', nombre: 'PAX' }))).toMatchObject({ valido: true })
  })

  it('otro tipo de origen no vale', () => {
    expect(errores(conOrigen({ tipo: 'catalogo' }))).toContain('elementos[0].origen.tipo: debe ser generico o tienda')
  })

  it('tienda y nombre obligatorios, no vacíos y con límite', () => {
    expect(errores(conOrigen({ tipo: 'tienda', nombre: 'PAX' }))).toContain('elementos[0].origen.proveedor: debe ser un texto de 1 a 60 caracteres')
    expect(errores(conOrigen({ tipo: 'tienda', proveedor: 'IKEA', nombre: '   ' }))).toContain('elementos[0].origen.nombre: debe ser un texto de 1 a 80 caracteres')
    expect(errores(conOrigen({ ...completo, referencia: 'x'.repeat(41) }))).toContain('elementos[0].origen.referencia: debe ser un texto de hasta 40 caracteres')
  })

  it('la URL solo http o https: un diseño compartido la pinta como enlace', () => {
    for (const url of ['javascript:alert(document.cookie)', 'data:text/html,x', 'www.ikea.com', 42]) {
      expect(errores(conOrigen({ ...completo, url }))).toContain('elementos[0].origen.url: debe ser una dirección http o https')
    }
  })

  it('el precio, un importe válido; la fecha, real y solo junto a un precio', () => {
    expect(errores(conOrigen({ ...completo, precio: -5 }))).toContain('elementos[0].origen.precio: debe ser un importe de 0 a 1.000.000 € con dos decimales como mucho')
    expect(errores(conOrigen({ ...completo, fechaPrecio: '2026-02-30' }))).toContain('elementos[0].origen.fechaPrecio: debe ser una fecha AAAA-MM-DD')
    const { precio: _, ...sinPrecio } = completo
    expect(errores(conOrigen(sinPrecio))).toContain('elementos[0].origen.fechaPrecio: solo puede ir junto a un precio')
  })
})

describe('validarDocumento: medidas extra', () => {
  const con = (medidasExtra: unknown) => ({ ...base(), elementos: [elemento('e1', { medidasExtra } as Partial<Elemento>)] })

  it('opcionales: sin ellas o con enteros ≥ 0, válido', () => {
    expect(validarDocumento({ ...base(), elementos: [elemento('e1')] })).toMatchObject({ valido: true })
    expect(validarDocumento(con({ huecoAncho: 0, huecoFondo: 58 }))).toMatchObject({ valido: true })
  })

  it('no objeto, decimales o negativos, no', () => {
    expect(errores(con([1]))).toContain('elementos[0].medidasExtra: debe ser un objeto')
    expect(errores(con({ huecoAncho: 10.5 }))).toContain('elementos[0].medidasExtra.huecoAncho: debe ser un entero mayor o igual que 0')
    expect(errores(con({ huecoAncho: -1 }))).toContain('elementos[0].medidasExtra.huecoAncho: debe ser un entero mayor o igual que 0')
  })
})
