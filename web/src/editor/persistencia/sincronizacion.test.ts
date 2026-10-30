// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorDeApi } from '../../api/cliente'
import type { DisenoServidor } from '../../disenos/servidor'
import { documentoNuevo, type DocumentoDiseno } from '../../nucleo'
import { crearAlmacen } from '../estado/almacen'
import { leerCopiaLocal } from './local'
import {
  abrirDiseno, anularSincronizacion, conectarSincronizacion, elegirApertura, esperarGuardados, REINTENTO_MS, renombrar, resolverConflicto,
} from './sincronizacion'

const servidor = vi.hoisted(() => ({ guardarDiseno: vi.fn(), obtenerDiseno: vi.fn() }))
vi.mock('../../disenos/servidor', () => servidor)

const ID = '11111111-1111-1111-1111-111111111111'
const doc = documentoNuevo('cocina', 400, 300, 250)
const alto = (n: number) => (d: DocumentoDiseno): DocumentoDiseno => ({ ...d, estancia: { ...d.estancia, alto: n } })

function falso(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    clear: () => m.clear(),
    getItem: (k: string) => m.get(k) ?? null,
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => { m.delete(k) },
    setItem: (k: string, v: string) => { m.set(k, v) },
  }
}

function disenoServidor(version: number, contenido: DocumentoDiseno = doc, nombre = 'Cocina'): DisenoServidor {
  return {
    id: ID, nombre, tipoEstancia: 'cocina', fechaDeCreacion: '2026-01-01T00:00:00Z',
    fechaDeModificacion: '2026-01-01T00:00:00Z', version, contenido,
  }
}

/** Servidor falso con una versión que sube en cada guardado y 412 si el If-Match no coincide. */
function servidorConVersion(inicial: number) {
  const estado = { version: inicial, contenido: doc, nombre: 'Cocina' }
  servidor.guardarDiseno.mockImplementation(async (_id: string, version: number, c: { nombre?: string; doc?: DocumentoDiseno }) => {
    if (version !== estado.version) throw new ErrorDeApi(412, 'cambiado', estado.version)
    estado.version++
    if (c.doc) estado.contenido = c.doc
    if (c.nombre) estado.nombre = c.nombre
    return disenoServidor(estado.version, estado.contenido, estado.nombre)
  })
  servidor.obtenerDiseno.mockImplementation(async () => ({
    diseno: disenoServidor(estado.version, estado.contenido, estado.nombre), version: estado.version,
  }))
  return estado
}

const desconectadores: Array<() => void> = []
function preparar(version = 4, st: Storage = falso()) {
  const a = crearAlmacen()
  desconectadores.push(conectarSincronizacion(a, { esperaMs: 2000, st }))
  a.getState().abrirDelServidor(ID, version, 'Cocina', doc)
  return { a, st }
}

beforeEach(() => {
  vi.useFakeTimers()
  servidor.guardarDiseno.mockReset()
  servidor.obtenerDiseno.mockReset()
})
afterEach(() => {
  desconectadores.splice(0).forEach((d) => d())
  vi.useRealTimers()
})

const version = (a: ReturnType<typeof crearAlmacen>) => {
  const o = a.getState().origen
  return o.tipo === 'servidor' ? o.version : null
}

describe('sincronización con el servidor', () => {
  it('3 cambios en 1 s: un solo guardado 2 s después del último, con la versión, y la versión sube', async () => {
    servidorConVersion(4)
    const { a } = preparar(4)
    a.getState().cambiar(alto(260))
    await vi.advanceTimersByTimeAsync(500)
    a.getState().cambiar(alto(270))
    await vi.advanceTimersByTimeAsync(500)
    a.getState().cambiar(alto(280))
    expect(a.getState().guardado).toBe('pendiente')
    await vi.advanceTimersByTimeAsync(1999)
    expect(servidor.guardarDiseno).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(servidor.guardarDiseno).toHaveBeenCalledTimes(1)
    const [id, v, cambios] = servidor.guardarDiseno.mock.calls[0]!
    expect(id).toBe(ID)
    expect(v).toBe(4)
    expect(cambios.doc.estancia.alto).toBe(280)
    // La API reemplaza el diseño entero: el documento viaja con su nombre.
    expect(cambios.nombre).toBe('Cocina')
    expect(version(a)).toBe(5)
    expect(a.getState().guardado).toBe('guardado')
  })

  it('la copia local se escribe al instante y queda sin pendiente tras guardar', async () => {
    servidorConVersion(4)
    const { a, st } = preparar(4)
    a.getState().cambiar(alto(260))
    expect(leerCopiaLocal(st, ID)).toMatchObject({ version: 4, pendiente: true })
    expect(leerCopiaLocal(st, ID)?.documento.estancia.alto).toBe(260)
    await vi.advanceTimersByTimeAsync(2000)
    expect(leerCopiaLocal(st, ID)).toMatchObject({ version: 5, pendiente: false })
    expect(leerCopiaLocal(st, ID)?.documento.estancia.alto).toBe(260)
  })

  it('sin red: "sinConexion", conserva la copia y al volver la red reintenta y queda guardado', async () => {
    const remoto = servidorConVersion(4)
    const real = servidor.guardarDiseno.getMockImplementation()!
    servidor.guardarDiseno.mockRejectedValueOnce(new ErrorDeApi(0, 'sin red'))
    const { a, st } = preparar(4)
    a.getState().cambiar(alto(260))
    await vi.advanceTimersByTimeAsync(2000)
    expect(a.getState().guardado).toBe('sinConexion')
    expect(leerCopiaLocal(st, ID)).toMatchObject({ version: 4, pendiente: true })
    servidor.guardarDiseno.mockImplementation(real)
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)
    expect(servidor.guardarDiseno).toHaveBeenCalledTimes(2)
    expect(servidor.guardarDiseno.mock.calls[1]![1]).toBe(4)
    expect(a.getState().guardado).toBe('guardado')
    expect(remoto.version).toBe(5)
    expect(leerCopiaLocal(st, ID)).toMatchObject({ version: 5, pendiente: false })
  })

  it('sin red: reintenta cada 30 s mientras dure', async () => {
    servidorConVersion(4)
    const real = servidor.guardarDiseno.getMockImplementation()!
    servidor.guardarDiseno.mockRejectedValue(new ErrorDeApi(0, 'sin red'))
    const { a } = preparar(4)
    a.getState().cambiar(alto(260))
    await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(servidor.guardarDiseno).toHaveBeenCalledTimes(2)
    expect(a.getState().guardado).toBe('sinConexion')
    servidor.guardarDiseno.mockImplementation(real)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(a.getState().guardado).toBe('guardado')
    await vi.advanceTimersByTimeAsync(90_000)
    expect(servidor.guardarDiseno).toHaveBeenCalledTimes(3)
  })

  it('sin red y cambiado en otro sitio: al volver la red sale el conflicto', async () => {
    const remoto = servidorConVersion(4)
    servidor.guardarDiseno.mockRejectedValueOnce(new ErrorDeApi(0, 'sin red'))
    const { a } = preparar(4)
    a.getState().cambiar(alto(260))
    await vi.advanceTimersByTimeAsync(2000)
    remoto.version = 7
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)
    expect(a.getState().guardado).toBe('conflicto')
    expect(a.getState().versionRemota).toBe(7)
  })

  it('412 con versión 9: conflicto; sobrescribir envía la 9', async () => {
    const remoto = servidorConVersion(9)
    const { a, st } = preparar(4)
    a.getState().cambiar(alto(260))
    await vi.advanceTimersByTimeAsync(2000)
    expect(a.getState().guardado).toBe('conflicto')
    expect(a.getState().versionRemota).toBe(9)
    a.getState().cambiar(alto(265))
    await vi.advanceTimersByTimeAsync(5000)
    expect(servidor.guardarDiseno).toHaveBeenCalledTimes(1)
    expect(a.getState().guardado).toBe('conflicto')
    await resolverConflicto(a, 'sobrescribir')
    expect(servidor.guardarDiseno).toHaveBeenCalledTimes(2)
    expect(servidor.guardarDiseno.mock.calls[1]![1]).toBe(9)
    expect(servidor.guardarDiseno.mock.calls[1]![2].doc.estancia.alto).toBe(265)
    expect(remoto.version).toBe(10)
    expect(version(a)).toBe(10)
    expect(a.getState().guardado).toBe('guardado')
    expect(leerCopiaLocal(st, ID)).toMatchObject({ version: 10, pendiente: false })
  })

  it('412: recargar carga el documento remoto y descarta los cambios locales', async () => {
    const remoto = servidorConVersion(9)
    remoto.contenido = alto(300)(doc)
    const { a, st } = preparar(4)
    a.getState().cambiar(alto(260))
    await vi.advanceTimersByTimeAsync(2000)
    expect(a.getState().guardado).toBe('conflicto')
    await resolverConflicto(a, 'recargar')
    expect(a.getState().documento?.estancia.alto).toBe(300)
    expect(version(a)).toBe(9)
    expect(a.getState().guardado).toBe('guardado')
    expect(a.getState().pasado).toEqual([])
    expect(leerCopiaLocal(st, ID)).toMatchObject({ version: 9, pendiente: false })
    await vi.advanceTimersByTimeAsync(5000)
    expect(servidor.guardarDiseno).toHaveBeenCalledTimes(1)
  })

  it('dos almacenes con la misma versión 4: el primero guarda la 5 y el segundo recibe 412', async () => {
    servidorConVersion(4)
    const uno = preparar(4)
    const dos = preparar(4)
    uno.a.getState().cambiar(alto(260))
    await vi.advanceTimersByTimeAsync(2000)
    expect(version(uno.a)).toBe(5)
    expect(uno.a.getState().guardado).toBe('guardado')
    dos.a.getState().cambiar(alto(270))
    await vi.advanceTimersByTimeAsync(2000)
    expect(dos.a.getState().guardado).toBe('conflicto')
    expect(dos.a.getState().versionRemota).toBe(5)
    expect(leerCopiaLocal(dos.st, ID)).toMatchObject({ version: 4, pendiente: true })
  })

  it('con origen anónimo no llama al servidor', async () => {
    const a = crearAlmacen()
    desconectadores.push(conectarSincronizacion(a, { esperaMs: 2000, st: falso() }))
    a.getState().crear('salon', 400, 300, 250)
    a.getState().cambiar(alto(260))
    await vi.advanceTimersByTimeAsync(10_000)
    expect(servidor.guardarDiseno).not.toHaveBeenCalled()
  })

  it('un cambio durante un guardado en vuelo espera y sale después con la versión nueva', async () => {
    servidorConVersion(4)
    const real = servidor.guardarDiseno.getMockImplementation()!
    let soltar: () => void = () => {}
    servidor.guardarDiseno.mockImplementationOnce(async (...args: Parameters<typeof real>) => {
      await new Promise<void>((r) => { soltar = r })
      return real(...args)
    })
    const { a } = preparar(4)
    a.getState().cambiar(alto(260))
    await vi.advanceTimersByTimeAsync(2000)
    a.getState().cambiar(alto(270))
    await vi.advanceTimersByTimeAsync(2000)
    expect(servidor.guardarDiseno).toHaveBeenCalledTimes(1)
    soltar()
    await vi.advanceTimersByTimeAsync(0)
    expect(servidor.guardarDiseno).toHaveBeenCalledTimes(2)
    expect(servidor.guardarDiseno.mock.calls[1]![1]).toBe(5)
    expect(servidor.guardarDiseno.mock.calls[1]![2].doc.estancia.alto).toBe(270)
    expect(version(a)).toBe(6)
    expect(a.getState().guardado).toBe('guardado')
  })

  it('otro error: "error"; un 401 también da "error" y conserva la copia local pendiente', async () => {
    servidor.guardarDiseno.mockRejectedValueOnce(new ErrorDeApi(500, 'caído'))
    const { a, st } = preparar(4)
    a.getState().cambiar(alto(260))
    await vi.advanceTimersByTimeAsync(2000)
    expect(a.getState().guardado).toBe('error')
    servidor.guardarDiseno.mockRejectedValueOnce(new ErrorDeApi(401, 'caducada'))
    a.getState().cambiar(alto(270))
    await vi.advanceTimersByTimeAsync(2000)
    expect(a.getState().guardado).toBe('error')
    expect(leerCopiaLocal(st, ID)).toMatchObject({ version: 4, pendiente: true })
    expect(leerCopiaLocal(st, ID)?.documento.estancia.alto).toBe(270)
  })

  it('volver al anónimo con un cambio sin enviar lo guarda sin esperar', async () => {
    servidorConVersion(4)
    const { a, st } = preparar(4)
    a.getState().cambiar(alto(260))
    a.getState().volverAAnonimo(st)
    await vi.advanceTimersByTimeAsync(0)
    expect(servidor.guardarDiseno).toHaveBeenCalledTimes(1)
    expect(a.getState().origen.tipo).toBe('anonimo')
    expect(leerCopiaLocal(st, ID)).toMatchObject({ version: 5, pendiente: false })
  })

  it('renombrar guarda el nombre con la versión vigente', async () => {
    servidorConVersion(4)
    const { a } = preparar(4)
    renombrar(a, '  Cocina nueva ')
    await vi.advanceTimersByTimeAsync(0)
    // La API reemplaza el diseño entero: el nombre nuevo viaja con el documento.
    expect(servidor.guardarDiseno).toHaveBeenCalledWith(ID, 4, { nombre: 'Cocina nueva', doc })
    expect(a.getState().origen).toMatchObject({ nombre: 'Cocina nueva', version: 5 })
  })

  it('abrirDiseno con una copia pendiente la sube 2 s después', async () => {
    servidorConVersion(4)
    const a = crearAlmacen()
    const st = falso()
    desconectadores.push(conectarSincronizacion(a, { esperaMs: 2000, st }))
    abrirDiseno(a, { id: ID, version: 4, nombre: 'Cocina', documento: alto(260)(doc), pendiente: true, guardado: 'pendiente' })
    expect(leerCopiaLocal(st, ID)).toMatchObject({ version: 4, pendiente: true })
    await vi.advanceTimersByTimeAsync(2000)
    expect(servidor.guardarDiseno).toHaveBeenCalledTimes(1)
    expect(a.getState().guardado).toBe('guardado')
  })
})

describe('sincronización: arreglos de la revisión', () => {
  /** El siguiente guardarDiseno queda retenido hasta llamar a la función devuelta. */
  function retenerGuardado(): () => void {
    const real = servidor.guardarDiseno.getMockImplementation()!
    let soltar: () => void = () => {}
    servidor.guardarDiseno.mockImplementationOnce(async (...args: Parameters<typeof real>) => {
      await new Promise<void>((r) => { soltar = r })
      return real(...args)
    })
    return () => soltar()
  }

  it('salir con un cambio y volver: se espera al guardado en marcha y el siguiente sale con su versión, sin 412', async () => {
    servidorConVersion(4)
    const soltar = retenerGuardado()
    const { a, st } = preparar(4)
    a.getState().cambiar(alto(260))
    await vi.advanceTimersByTimeAsync(500)
    a.getState().volverAAnonimo(st)
    await vi.advanceTimersByTimeAsync(0)
    expect(servidor.guardarDiseno).toHaveBeenCalledTimes(1)
    // Lo que hace EditorDeDiseno al volver: esperar, leer la copia y el servidor, y abrir.
    let esperado = false
    const espera = esperarGuardados(ID).then(() => { esperado = true })
    await vi.advanceTimersByTimeAsync(0)
    expect(esperado).toBe(false)
    soltar()
    await espera
    const apertura = elegirApertura(ID, leerCopiaLocal(st, ID), await servidor.obtenerDiseno(ID))
    expect(apertura).toMatchObject({ version: 5, pendiente: false, guardado: 'guardado' })
    abrirDiseno(a, apertura!)
    expect(a.getState().documento?.estancia.alto).toBe(260)
    a.getState().cambiar(alto(270))
    await vi.advanceTimersByTimeAsync(2000)
    expect(servidor.guardarDiseno).toHaveBeenCalledTimes(2)
    expect(servidor.guardarDiseno.mock.calls[1]![1]).toBe(5)
    expect(a.getState().guardado).toBe('guardado')
    expect(leerCopiaLocal(st, ID)).toMatchObject({ version: 6, pendiente: false })
    expect(leerCopiaLocal(st, ID)?.documento.estancia.alto).toBe(270)
  })

  it('un guardado de un trabajo dejado no pisa la copia del mismo diseño abierto otra vez', async () => {
    servidorConVersion(4)
    const soltar = retenerGuardado()
    const { a, st } = preparar(4)
    a.getState().cambiar(alto(260))
    a.getState().volverAAnonimo(st)
    await vi.advanceTimersByTimeAsync(0)
    abrirDiseno(a, elegirApertura(ID, leerCopiaLocal(st, ID), { diseno: disenoServidor(4), version: 4 })!)
    a.getState().cambiar(alto(290))
    soltar()
    await vi.advanceTimersByTimeAsync(0)
    expect(leerCopiaLocal(st, ID)).toMatchObject({ pendiente: true })
    expect(leerCopiaLocal(st, ID)?.documento.estancia.alto).toBe(290)
  })

  it('abrir con un renombrado pendiente lo envía', async () => {
    servidorConVersion(4)
    const a = crearAlmacen()
    desconectadores.push(conectarSincronizacion(a, { esperaMs: 2000, st: falso() }))
    const copia = { version: 4, nombre: 'Cocina nueva', documento: doc, pendiente: true }
    abrirDiseno(a, elegirApertura(ID, copia, { diseno: disenoServidor(4), version: 4 })!)
    expect(a.getState().origen).toMatchObject({ nombre: 'Cocina nueva' })
    await vi.advanceTimersByTimeAsync(2000)
    expect(servidor.guardarDiseno.mock.calls[0]![2]).toMatchObject({ nombre: 'Cocina nueva' })
    expect(a.getState().guardado).toBe('guardado')
  })

  it('abierta sin conexión una copia sin cambios: no marca "Guardado" hasta que el servidor responde', async () => {
    servidorConVersion(4)
    servidor.obtenerDiseno.mockRejectedValueOnce(new ErrorDeApi(0, 'sin red'))
    const a = crearAlmacen()
    desconectadores.push(conectarSincronizacion(a, { esperaMs: 2000, st: falso() }))
    abrirDiseno(a, elegirApertura(ID, { version: 4, documento: doc, pendiente: false }, null)!)
    expect(a.getState().guardado).toBe('sinConexion')
    await vi.advanceTimersByTimeAsync(REINTENTO_MS)
    expect(servidor.obtenerDiseno).toHaveBeenCalledTimes(1)
    expect(a.getState().guardado).toBe('sinConexion')
    await vi.advanceTimersByTimeAsync(REINTENTO_MS)
    expect(servidor.obtenerDiseno).toHaveBeenCalledTimes(2)
    expect(a.getState().guardado).toBe('guardado')
    expect(servidor.guardarDiseno).not.toHaveBeenCalled()
  })

  it('sin conexión, sin cambios y con otra versión en el servidor: trae la del servidor', async () => {
    const remoto = servidorConVersion(6)
    remoto.contenido = alto(300)(doc)
    const a = crearAlmacen()
    desconectadores.push(conectarSincronizacion(a, { esperaMs: 2000, st: falso() }))
    abrirDiseno(a, elegirApertura(ID, { version: 4, documento: doc, pendiente: false }, null)!)
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)
    expect(version(a)).toBe(6)
    expect(a.getState().documento?.estancia.alto).toBe(300)
    expect(a.getState().guardado).toBe('guardado')
  })

  it('si no se puede escribir la copia local, avisa', () => {
    const st = falso()
    st.setItem = () => { throw new DOMException('lleno', 'QuotaExceededError') }
    const { a } = preparar(4, st)
    a.getState().cambiar(alto(260))
    expect(a.getState().aviso).toBe('No se pudo guardar la copia en este navegador')
  })

  it('avisa al cerrar la página con cambios sin subir', async () => {
    servidorConVersion(4)
    const { a } = preparar(4)
    const salir = () => {
      const e = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(e)
      return e.defaultPrevented
    }
    expect(salir()).toBe(false)
    a.getState().cambiar(alto(260))
    expect(salir()).toBe(true)
    await vi.advanceTimersByTimeAsync(2000)
    expect(a.getState().guardado).toBe('guardado')
    expect(salir()).toBe(false)
  })
})

describe('elegirApertura', () => {
  const copia = (version: number, pendiente: boolean) => ({ version, nombre: 'Local', documento: alto(260)(doc), pendiente })
  const remoto = (version: number) => ({ diseno: disenoServidor(version), version })

  it('copia pendiente con la misma versión: la local, pendiente', () => {
    const r = elegirApertura(ID, { ...copia(4, true), nombre: 'Cocina' }, remoto(4))
    expect(r).toMatchObject({ version: 4, nombre: 'Cocina', pendiente: true, guardado: 'pendiente' })
    expect(r?.nombrePendiente).toBeUndefined()
  })

  it('copia de la misma versión con otro nombre: restaura el renombrado como pendiente', () => {
    expect(elegirApertura(ID, copia(4, true), remoto(4))).toMatchObject({ nombre: 'Local', nombrePendiente: 'Local', guardado: 'pendiente' })
  })

  it('servidor con versión mayor que la copia pendiente: la local, en conflicto', () => {
    const r = elegirApertura(ID, copia(4, true), remoto(6))
    expect(r).toMatchObject({ version: 4, pendiente: true, guardado: 'conflicto', versionRemota: 6 })
    expect(r?.documento.estancia.alto).toBe(260)
  })

  it('sin conexión: la copia local', () => {
    expect(elegirApertura(ID, copia(4, true), null)).toMatchObject({ version: 4, nombre: 'Local', pendiente: true, guardado: 'sinConexion' })
    expect(elegirApertura(ID, null, null)).toBeNull()
  })

  it('si no, la del servidor', () => {
    expect(elegirApertura(ID, copia(4, false), remoto(6))).toMatchObject({ version: 6, pendiente: false, guardado: 'guardado' })
    expect(elegirApertura(ID, null, remoto(6))?.documento).toEqual(doc)
  })
})

describe('anular la sincronización al cerrar la sesión', () => {
  it('un guardado en marcha que termina después no vuelve a escribir la copia', async () => {
    let responder: (d: DisenoServidor) => void = () => {}
    servidor.guardarDiseno.mockImplementation(() => new Promise<DisenoServidor>((r) => { responder = r }))
    const { a, st } = preparar(4)
    a.getState().cambiar(alto(260))
    await vi.advanceTimersByTimeAsync(2000)
    expect(servidor.guardarDiseno).toHaveBeenCalledOnce()
    anularSincronizacion(a)
    st.removeItem(`decorazon.diseno.${ID}`)
    responder(disenoServidor(5, alto(260)(doc)))
    await esperarGuardados(ID)
    expect(st.getItem(`decorazon.diseno.${ID}`)).toBeNull()
  })

  it('lo que quedaba por subir no se sube ni se reintenta', async () => {
    servidorConVersion(4)
    const { a, st } = preparar(4)
    a.getState().cambiar(alto(260))
    anularSincronizacion(a)
    st.removeItem(`decorazon.diseno.${ID}`)
    a.getState().volverAAnonimo(st)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(servidor.guardarDiseno).not.toHaveBeenCalled()
    expect(st.getItem(`decorazon.diseno.${ID}`)).toBeNull()
  })
})
