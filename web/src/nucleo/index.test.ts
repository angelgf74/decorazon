import { describe, expect, it } from 'vitest'
import * as nucleo from './index'
import type {
  Catalogo, Cota, DefinicionTipo, DefinicionVariante, Obstaculo, ObstaculosEstancia, Prisma, Rango, ResultadoEdicion, ResultadoValidacion, ZonaApertura, ZonaColor,
} from './index'

// Los tipos se comprueban al compilar (`tsc -b` incluye los tests).
type Exportados = [Catalogo, Cota, DefinicionTipo, DefinicionVariante, Obstaculo, ObstaculosEstancia, Prisma, Rango, ResultadoEdicion, ResultadoValidacion, ZonaApertura, ZonaColor]
const tipos: Exportados | null = null

describe('API pública del núcleo', () => {
  it('exporta los valores', () => {
    expect(tipos).toBeNull()
    expect(nucleo.TOLERANCIA_CM).toBe(0.1)
    expect(nucleo.IMAN_CM).toBe(15)
    for (const f of ['obstaculosDeEstancia', 'rectangulo', 'rotar', 'distanciaAlBorde', 'documentoNuevo', 'validarDocumento', 'detectarConflictos',
      'desplazarPoligono', 'esRectangular', 'longitudPared', 'redimensionarRectangulo', 'cambiarLongitudPared', 'moverVertice', 'alinearVertice',
      'partirPared', 'quitarVertice', 'imantar', 'cotasAParedes', 'cotasEnPared', 'anadirElemento', 'moverElemento', 'editarElemento', 'duplicarElemento',
      'quitarElemento', 'anadirAbertura', 'anadirEstructura', 'editarAbertura', 'editarEstructura', 'quitarDeEstancia', 'redondearNumeros',
      'serializarDocumento', 'tiradorDeGiro', 'capitalizar', 'valorVariante', 'catalogoDeEstancia'] as const) {
      expect(typeof nucleo[f]).toBe('function')
    }
  })
})
