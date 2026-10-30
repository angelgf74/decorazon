import { describe, expect, it } from 'vitest'
import { catalogoBase, documentoNuevo, elementoNuevo, moverElemento, piezasDeElemento } from '../../nucleo'
import { crearAlmacen } from './almacen'
import { conflictosDe } from './conflictos'

const MOVIMIENTOS = 60
// En integración continua los equipos son más lentos y ruidosos.
const enCI = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.CI
const UMBRAL_MS = enCI ? 50 : 16

describe('rendimiento del arrastre', () => {
  it(`con 40 elementos, un movimiento cuesta de media menos de ${UMBRAL_MS} ms`, () => {
    const tipos = [...catalogoBase.values()].filter((d) => d.categoria === 'mueble')
    const doc = documentoNuevo('salon', 600, 500, 250)
    // Rejilla de 8 x 5 con celdas de 75 x 100 cm; los muebles grandes se solapan con los vecinos.
    for (let i = 0; i < 40; i++) {
      const def = tipos[i % tipos.length]
      const pos = { x: 40 + (i % 8) * 75, y: 50 + Math.floor(i / 8) * 100 }
      doc.elementos.push(elementoNuevo(def, pos, `e${i}`))
    }
    const a = crearAlmacen()
    a.getState().cargar(doc)

    const tiempos: number[] = []
    for (let paso = 1; paso <= MOVIMIENTOS; paso++) {
      const t0 = performance.now()
      a.getState().cambiar((d) => moverElemento(d, catalogoBase, 'e0', { x: 40 + paso * 5, y: 50 + paso * 3 }, 0, false), 'mover:e0')
      const actual = a.getState().documento!
      conflictosDe(actual)
      for (const e of actual.elementos) piezasDeElemento(e, catalogoBase.get(e.tipo)!)
      tiempos.push(performance.now() - t0)
    }
    a.getState().terminarGrupo()

    const media = tiempos.reduce((s, t) => s + t, 0) / tiempos.length
    console.info(`arrastre: media ${media.toFixed(2)} ms, máximo ${Math.max(...tiempos).toFixed(2)} ms`)
    expect(a.getState().pasado).toHaveLength(1)
    expect(media).toBeLessThan(UMBRAL_MS)
  })
})
