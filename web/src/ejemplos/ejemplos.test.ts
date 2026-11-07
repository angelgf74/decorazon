import { describe, expect, it } from 'vitest'
import { catalogoBase, detectarConflictos, validarDocumento } from '../nucleo'
import { EJEMPLOS } from './index'

/** Las imágenes que hay en `public/ejemplos`, como rutas servidas (`/ejemplos/x.png`). */
const IMAGENES = Object.keys(import.meta.glob('/public/ejemplos/*', { query: '?url' })).map((ruta) => ruta.replace(/^\/public/, ''))

describe('ejemplos del inicio', () => {
  it('son tres, de estancias distintas, con id y nombre propios', () => {
    expect(EJEMPLOS).toHaveLength(3)
    expect(new Set(EJEMPLOS.map((e) => e.tipo)).size).toBe(3)
    expect(new Set(EJEMPLOS.map((e) => e.id)).size).toBe(3)
    for (const e of EJEMPLOS) expect(e.documento.estancia.tipo).toBe(e.tipo)
  })

  describe.each(EJEMPLOS)('$nombre', (ejemplo) => {
    it('es un documento válido que se carga por el mismo camino que cualquier diseño', () => {
      const r = validarDocumento(JSON.parse(JSON.stringify(ejemplo.documento)))
      expect(r.valido, r.valido ? '' : r.errores.join('; ')).toBe(true)
    })
    it('tiene puerta, ventana y al menos cinco muebles', () => {
      expect(ejemplo.documento.aberturas.some((a) => a.tipo === 'puerta')).toBe(true)
      expect(ejemplo.documento.aberturas.some((a) => a.tipo === 'ventana')).toBe(true)
      expect(ejemplo.documento.elementos.length).toBeGreaterThanOrEqual(5)
    })
    it('no tiene ni errores ni avisos: es lo primero que ve quien llega, y «6 avisos» resta confianza', () => {
      expect(detectarConflictos(ejemplo.documento, catalogoBase).map((c) => c.mensaje)).toEqual([])
    })
    it('su imagen existe en public', () => {
      expect(ejemplo.imagen).toMatch(/^\/ejemplos\/[a-z-]+\.(png|jpg|webp)$/)
      expect(IMAGENES, ejemplo.imagen).toContain(ejemplo.imagen)
    })
  })
})
