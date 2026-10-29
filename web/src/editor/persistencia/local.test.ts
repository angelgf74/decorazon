import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { documentoNuevo } from '../../nucleo'
import { crearAlmacen } from '../estado/almacen'
import { CLAVE_DESCARTADO, CLAVE_DISENO, conectarPersistencia, guardarDisenoLocal, leerDisenoLocal } from './local'

function falso(): Storage & { escrituras: number } {
  const m = new Map<string, string>()
  const st = {
    escrituras: 0,
    get length() { return m.size },
    clear: () => m.clear(),
    getItem: (k: string) => m.get(k) ?? null,
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => { m.delete(k) },
    setItem: (k: string, v: string) => { st.escrituras++; m.set(k, v) },
  }
  return st
}

const doc = documentoNuevo('salon', 400, 300, 250)
const alto = (n: number) => (d: typeof doc): typeof doc => ({ ...d, estancia: { ...d.estancia, alto: n } })

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('local', () => {
  it('guardar y leer da el mismo documento', () => {
    const st = falso()
    expect(guardarDisenoLocal(st, doc)).toBe(true)
    expect(leerDisenoLocal(st)).toEqual(doc)
  })

  it('JSON roto: null y copia en descartado', () => {
    const st = falso()
    st.setItem(CLAVE_DISENO, '{roto')
    expect(leerDisenoLocal(st)).toBeNull()
    expect(st.getItem(CLAVE_DESCARTADO)).toBe('{roto')
    expect(st.getItem(CLAVE_DISENO)).toBeNull()
  })

  it('versión 2: null', () => {
    const st = falso()
    st.setItem(CLAVE_DISENO, JSON.stringify({ version: 2, documento: doc }))
    expect(leerDisenoLocal(st)).toBeNull()
    expect(st.getItem(CLAVE_DESCARTADO)).not.toBeNull()
  })

  it('formato 9: null', () => {
    const st = falso()
    st.setItem(CLAVE_DISENO, JSON.stringify({ version: 1, documento: { ...doc, formato: 9 } }))
    expect(leerDisenoLocal(st)).toBeNull()
    expect(st.getItem(CLAVE_DISENO)).toBeNull()
  })

  it('sin almacenamiento', () => {
    expect(leerDisenoLocal(null)).toBeNull()
    expect(guardarDisenoLocal(null, doc)).toBe(false)
  })

  it('cuota llena: guardar da false y el estado acaba en error', () => {
    const st = falso()
    st.setItem = () => { throw new DOMException('lleno', 'QuotaExceededError') }
    expect(guardarDisenoLocal(st, doc)).toBe(false)
    const a = crearAlmacen()
    conectarPersistencia(a, st)
    a.getState().crear('salon', 400, 300, 250)
    vi.advanceTimersByTime(500)
    expect(a.getState().guardado).toBe('error')
  })

  it('agrupa cambios: una escritura 500 ms después del último', () => {
    const st = falso()
    const a = crearAlmacen()
    const desconectar = conectarPersistencia(a, st)
    a.getState().crear('salon', 400, 300, 250)
    vi.advanceTimersByTime(100)
    a.getState().cambiar(alto(260))
    vi.advanceTimersByTime(100)
    a.getState().cambiar(alto(270))
    expect(a.getState().guardado).toBe('pendiente')
    vi.advanceTimersByTime(499)
    expect(st.escrituras).toBe(0)
    vi.advanceTimersByTime(1)
    expect(st.escrituras).toBe(1)
    expect(a.getState().guardado).toBe('guardado')
    expect(leerDisenoLocal(st)?.estancia.alto).toBe(270)
    desconectar()
  })

  it('descartar borra la clave', () => {
    const st = falso()
    const a = crearAlmacen()
    conectarPersistencia(a, st)
    a.getState().crear('salon', 400, 300, 250)
    vi.advanceTimersByTime(500)
    expect(st.getItem(CLAVE_DISENO)).not.toBeNull()
    a.getState().descartar()
    vi.advanceTimersByTime(500)
    expect(st.getItem(CLAVE_DISENO)).toBeNull()
  })
})
