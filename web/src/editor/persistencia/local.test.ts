// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { documentoNuevo } from '../../nucleo'
import { crearAlmacen } from '../estado/almacen'
import {
  CLAVE_DESCARTADO, CLAVE_DISENO, conectarPersistencia, guardarCopiaLocal, guardarDisenoLocal, leerCopiaLocal, leerDisenoLocal,
  listarCopiasLocales,
} from './local'

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

const desconectadores: Array<() => void> = []
const conectar: typeof conectarPersistencia = (...args) => {
  const d = conectarPersistencia(...args)
  desconectadores.push(d)
  return d
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  desconectadores.splice(0).forEach((d) => d())
  vi.useRealTimers()
})

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
    conectar(a, st)
    a.getState().crear('salon', 400, 300, 250)
    vi.advanceTimersByTime(500)
    expect(a.getState().guardado).toBe('error')
  })

  it('cambios sin pausa (un arrastre largo): escribe como muy tarde 2 s después del primero', () => {
    const st = falso()
    const a = crearAlmacen()
    conectar(a, st)
    a.getState().crear('salon', 400, 300, 250)
    for (let n = 1; n <= 25; n++) {
      a.getState().cambiar(alto(250 + n))
      vi.advanceTimersByTime(100)
    }
    expect(st.escrituras).toBe(1)
    expect(leerDisenoLocal(st)!.estancia.alto).toBeGreaterThanOrEqual(268)
  })

  it('agrupa cambios: una escritura 500 ms después del último', () => {
    const st = falso()
    const a = crearAlmacen()
    const desconectar = conectar(a, st)
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
    conectar(a, st)
    a.getState().crear('salon', 400, 300, 250)
    vi.advanceTimersByTime(500)
    expect(st.getItem(CLAVE_DISENO)).not.toBeNull()
    a.getState().descartar()
    vi.advanceTimersByTime(500)
    expect(st.getItem(CLAVE_DISENO)).toBeNull()
  })

  it('desconectar con un cambio pendiente guarda sin esperar', () => {
    const st = falso()
    const a = crearAlmacen()
    const desconectar = conectar(a, st)
    a.getState().crear('salon', 400, 300, 250)
    a.getState().cambiar(alto(280))
    desconectar()
    expect(leerDisenoLocal(st)?.estancia.alto).toBe(280)
    expect(a.getState().guardado).toBe('guardado')
    vi.advanceTimersByTime(1000)
    expect(st.escrituras).toBe(1)
  })

  it('sin almacenamiento, conectar marca error', () => {
    const a = crearAlmacen()
    conectar(a, null)
    expect(a.getState().guardado).toBe('error')
  })

  it('pagehide guarda al momento', () => {
    const st = falso()
    const a = crearAlmacen()
    conectar(a, st)
    a.getState().crear('salon', 400, 300, 250)
    expect(st.escrituras).toBe(0)
    globalThis.dispatchEvent(new Event('pagehide'))
    expect(st.escrituras).toBe(1)
    expect(a.getState().guardado).toBe('guardado')
  })

  it('visibilitychange a hidden guarda al momento; a visible no', () => {
    const st = falso()
    const a = crearAlmacen()
    conectar(a, st)
    a.getState().crear('salon', 400, 300, 250)
    let estado: DocumentVisibilityState = 'visible'
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => estado)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(st.escrituras).toBe(0)
    estado = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
    expect(st.escrituras).toBe(1)
  })

  it('con origen servidor no toca el diseño anónimo', () => {
    const st = falso()
    const a = crearAlmacen()
    conectar(a, st)
    a.getState().abrirDelServidor('d1', 4, 'Cocina', doc)
    a.getState().cambiar(alto(260))
    vi.advanceTimersByTime(1000)
    globalThis.dispatchEvent(new Event('pagehide'))
    expect(st.getItem(CLAVE_DISENO)).toBeNull()
    expect(a.getState().guardado).toBe('guardado')
  })

  it('un cambio anónimo pendiente se guarda tal cual al abrir un diseño del servidor', () => {
    const st = falso()
    const a = crearAlmacen()
    conectar(a, st)
    a.getState().crear('salon', 400, 300, 250)
    a.getState().cambiar(alto(280))
    a.getState().abrirDelServidor('d1', 4, 'Cocina', documentoNuevo('cocina', 500, 300, 250))
    vi.advanceTimersByTime(1000)
    expect(leerDisenoLocal(st)?.estancia.tipo).toBe('salon')
    expect(leerDisenoLocal(st)?.estancia.alto).toBe(280)
  })

  it('volver al anónimo no reescribe ni marca pendiente', () => {
    const st = falso()
    guardarDisenoLocal(st, doc)
    const a = crearAlmacen()
    conectar(a, st)
    a.getState().abrirDelServidor('d1', 4, 'Cocina', documentoNuevo('cocina', 500, 300, 250))
    st.escrituras = 0
    a.getState().volverAAnonimo(st)
    expect(a.getState().guardado).toBe('guardado')
    vi.advanceTimersByTime(1000)
    expect(st.escrituras).toBe(0)
  })

  it('copia local por id: guarda, lee y rechaza lo inválido', () => {
    const st = falso()
    expect(guardarCopiaLocal(st, 'd1', { version: 4, nombre: 'Cocina', documento: doc, pendiente: true })).toBe(true)
    expect(st.getItem('decorazon.diseno.d1')).not.toBeNull()
    expect(leerCopiaLocal(st, 'd1')).toEqual({ version: 4, nombre: 'Cocina', nombrePendiente: false, documento: doc, pendiente: true })
    expect(leerCopiaLocal(st, 'd2')).toBeNull()
    st.setItem('decorazon.diseno.d3', '{roto')
    expect(leerCopiaLocal(st, 'd3')).toBeNull()
    st.setItem('decorazon.diseno.d4', JSON.stringify({ version: 'x', documento: doc, pendiente: true }))
    expect(leerCopiaLocal(st, 'd4')).toBeNull()
    expect(leerCopiaLocal(null, 'd1')).toBeNull()
  })

  it('la copia conserva la marca de nombre pendiente y una copia antigua sin ella se lee como false', () => {
    const st = falso()
    guardarCopiaLocal(st, 'd1', { version: 4, nombre: 'Mi salón', nombrePendiente: true, documento: doc, pendiente: true })
    expect(leerCopiaLocal(st, 'd1')).toMatchObject({ nombre: 'Mi salón', nombrePendiente: true })
    guardarCopiaLocal(st, 'd2', { version: 4, nombre: 'Cocina', nombrePendiente: false, documento: doc, pendiente: false })
    expect(leerCopiaLocal(st, 'd2')?.nombrePendiente).toBe(false)
    // Lo que escribía la versión anterior: sin el campo.
    st.setItem('decorazon.diseno.d3', JSON.stringify({ version: 4, nombre: 'Cocina', documento: doc, pendiente: true }))
    expect(leerCopiaLocal(st, 'd3')).toMatchObject({ nombre: 'Cocina', nombrePendiente: false, pendiente: true })
  })

  it('listar copias: parsea cada una una vez y solo lee versión, pendiente, nombre y fecha; el documento se valida al abrirla', () => {
    const st = falso()
    guardarCopiaLocal(st, 'd1', { version: 4, nombre: 'Cocina', documento: doc, pendiente: true })
    st.setItem('decorazon.diseno.d2', JSON.stringify({ version: 2, documento: { formato: 99 }, pendiente: false, guardadaEn: '2026-01-01T00:00:00Z' }))
    st.setItem('decorazon.diseno.d3', '{roto')
    st.setItem('decorazon.diseno.d4', JSON.stringify({ version: 'x', documento: doc, pendiente: true }))
    st.setItem('decorazon.otra', '{}')
    const parse = vi.spyOn(JSON, 'parse')
    const lista = listarCopiasLocales(st)
    expect(parse).toHaveBeenCalledTimes(4)
    parse.mockRestore()
    expect(lista).toEqual([
      { id: 'd1', nombre: 'Cocina', guardadaEn: expect.any(String), pendiente: true },
      { id: 'd2', guardadaEn: '2026-01-01T00:00:00Z', pendiente: false },
    ])
    expect(leerCopiaLocal(st, 'd2')).toBeNull()
  })
})
