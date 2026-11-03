import { describe, expect, it } from 'vitest'
import { formatoFecha, formatoPrecio, hoy, leerPrecio } from './formatos'

describe('formatos de los muebles de tienda', () => {
  it('precio en euros a la española', () => {
    expect(formatoPrecio(199)).toMatch(/^199,00\s€$/)
    expect(formatoPrecio(0.5)).toMatch(/^0,50\s€$/)
    expect(formatoPrecio(1234.5)).toMatch(/^1\.234,50\s€$/)
  })

  it('fecha AAAA-MM-DD como dd/mm/aaaa', () => {
    expect(formatoFecha('2026-11-03')).toBe('03/11/2026')
  })

  it('hoy, en la fecha local y con ceros (a las 00:30 en España, en UTC aún es el día anterior)', () => {
    expect(hoy(new Date(2026, 0, 5, 0, 30))).toBe('2026-01-05')
    expect(hoy(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('leerPrecio acepta coma o punto y hasta dos decimales; lo demás es null', () => {
    expect(leerPrecio(' 199,99 ')).toBe(199.99)
    expect(leerPrecio('199.9')).toBe(199.9)
    expect(leerPrecio('0')).toBe(0)
    for (const t of ['', 'abc', '199,999', '-5', '1.234,50', '2000000']) expect(leerPrecio(t)).toBeNull()
  })
})
