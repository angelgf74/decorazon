import { describe, expect, it } from 'vitest'
import { capitalizar, conArticulo, deArticulo, lineasMedidasExtra, rangoMedidaExtra, valorMedidaExtra, valorVariante, type DefinicionTipo } from './tipos'
import { armario } from './definiciones/armario'
import { catalogoBase } from './catalogoBase'
import { aMundo } from './transformar'
import { elementoDe } from './definiciones/ayuda.test-util'

describe('artículos', () => {
  it('conArticulo / deArticulo / capitalizar', () => {
    expect(conArticulo('armario', 'm')).toBe('el armario')
    expect(conArticulo('cama', 'f')).toBe('la cama')
    expect(deArticulo('cómoda', 'f')).toBe('de la cómoda')
    expect(deArticulo('armario', 'm')).toBe('del armario')
    expect(capitalizar('la puerta')).toBe('La puerta')
  })
})
describe('catálogo base y aMundo', () => {
  it('tiene los cincuenta y nueve tipos', () => {
    expect([...catalogoBase.keys()].sort()).toEqual(['alfombra', 'aparador', 'archivador', 'armario', 'armario-espejo', 'armario-esquinero', 'banera', 'bide', 'cajonera', 'cama', 'campana', 'chimenea', 'columna-bano', 'columna-cocina', 'comoda', 'cortina', 'cuadro', 'cuna', 'ducha', 'encimera', 'escritorio', 'escritorio-l', 'espejo', 'estanteria', 'fregadero', 'frigorifico', 'inodoro', 'isla', 'lampara-pie', 'lavabo', 'lavadora', 'lavavajillas', 'libreria', 'litera', 'mesa', 'mesa-alta', 'mesa-auxiliar', 'mesa-centro', 'mesa-plegable', 'mesa-reuniones', 'mesita', 'modulo-alto', 'modulo-bajo', 'mueble-tv', 'papelera', 'perchero', 'placa', 'planta', 'puf', 'reposapies', 'silla', 'silla-oficina', 'sillon', 'sofa', 'sofa-cama', 'sofa-rinconera', 'taburete', 'vitrina', 'zapatero'])
  })
  it('aMundo rota en horario', () => {
    const p = aMundo(elementoDe('x', 10, 10, 90, 10, 10, 10), { x: 0, y: 5 })
    expect(p.x).toBeCloseTo(5, 9)
    expect(p.y).toBeCloseTo(10, 9)
  })
})
describe('valorVariante', () => {
  const con = (variantes: Record<string, string | number | boolean>) => elementoDe('armario', 0, 0, 0, 100, 60, 220, variantes)
  it('valor válido', () => {
    expect(valorVariante(armario, con({ modulos: 3 }), 'modulos')).toBe(3)
    expect(valorVariante(armario, con({ puertas: 'correderas' }), 'puertas')).toBe('correderas')
  })
  it('valor que no está en la definición: defecto', () => {
    expect(valorVariante(armario, con({ modulos: 0 }), 'modulos')).toBe(1)
    expect(valorVariante(armario, con({ modulos: 'abc' }), 'modulos')).toBe(1)
    expect(valorVariante(armario, con({ puertas: 'Abatibles' }), 'puertas')).toBe('abatibles')
  })
  it('variante desconocida lanza', () => {
    expect(() => valorVariante(armario, con({}), 'nada')).toThrow()
  })
})

describe('valorMedidaExtra', () => {
  const esquinero = catalogoBase.get('armario-esquinero')!
  const con = (medidasExtra?: Record<string, number>, variantes: Record<string, string | number | boolean> = {}) =>
    ({ ...elementoDe('armario-esquinero', 0, 0, 0, 110, 110, 201, variantes), ...(medidasExtra && { medidasExtra }) })

  it('el valor guardado, recortado a su rango; sin él, el de por defecto', () => {
    expect(valorMedidaExtra(esquinero, con({ huecoAncho: 11 }), 'huecoAncho')).toBe(11)
    expect(valorMedidaExtra(esquinero, con({ huecoAncho: 99 }), 'huecoAncho')).toBe(40)
    expect(valorMedidaExtra(esquinero, con({ profundidadFondo: 5 }), 'profundidadFondo')).toBe(30)
    expect(valorMedidaExtra(esquinero, con(), 'profundidadFondo')).toBe(58)
  })

  it('un esquinero guardado con la variante de profundidad de antes toma ese valor', () => {
    expect(valorMedidaExtra(esquinero, con(undefined, { profundidad: 35 }), 'profundidadFondo')).toBe(35)
    expect(valorMedidaExtra(esquinero, con(undefined, { profundidad: 35 }), 'anchoAla')).toBe(35)
    expect(valorMedidaExtra(esquinero, con({ profundidadFondo: 50 }, { profundidad: 35 }), 'profundidadFondo')).toBe(50)
  })

  it('una clave que el tipo no tiene es un error de programación', () => {
    expect(() => valorMedidaExtra(armario, elementoDe('armario', 0, 0, 0, 100, 60, 220), 'hueco')).toThrow()
  })
})

describe('rango efectivo y líneas de las medidas extra', () => {
  const esquinero = catalogoBase.get('armario-esquinero')!
  const con = (medidasExtra: Record<string, number>, ancho = 110) => ({ ...elementoDe('armario-esquinero', 0, 0, 0, ancho, 110, 201), medidasExtra })

  it('el rango depende de las demás medidas: con un ala de 30, el hueco no pasa de 20, y el valor tampoco', () => {
    expect(rangoMedidaExtra(esquinero, con({ anchoAla: 30 }), 'huecoAncho')).toEqual({ min: 0, max: 20, defecto: 0 })
    expect(valorMedidaExtra(esquinero, con({ anchoAla: 30, huecoAncho: 40 }), 'huecoAncho')).toBe(20)
    // Con 80 de ancho, el ala llega como mucho a 70.
    expect(rangoMedidaExtra(esquinero, con({}, 80), 'anchoAla').max).toBe(70)
  })

  it('las líneas de la hoja: las del tipo si las da; si no, «Etiqueta: N cm»', () => {
    expect(lineasMedidasExtra(esquinero, con({ huecoAncho: 11, huecoFondo: 58 }))).toEqual(['Profundidad del fondo: 58 cm', 'Ancho del ala: 58 cm', 'Hueco del rincón: 11 × 58 cm'])
    const sinLineas: DefinicionTipo = { ...esquinero, detallesExtra: undefined }
    expect(lineasMedidasExtra(sinLineas, con({ huecoAncho: 11 }))).toEqual(['Profundidad del fondo: 58 cm', 'Ancho del ala: 58 cm', 'Hueco: ancho: 11 cm', 'Hueco: fondo: 0 cm'])
    expect(lineasMedidasExtra(armario, elementoDe('armario', 0, 0, 0, 100, 60, 220))).toEqual([])
  })
})
