import { textos } from '../../textos'
import type { Abertura, Columna, DocumentoDiseno, Estructura, Puerta, Radiador, Ventana, Viga } from '../modelo/documento'
import { comprobarEstancia, longitudPared } from './planta'
import type { ResultadoEdicion } from './resultado'

const falla = (motivo: string): ResultadoEdicion => ({ ok: false, motivo })

/** Posición que centra un hueco de `ancho` en la pared, o null si la pared no existe. */
function centrada(doc: DocumentoDiseno, pared: number, ancho: number): number | null {
  const planta = doc.estancia.planta
  if (!Number.isInteger(pared) || pared < 0 || pared >= planta.length) return null
  return Math.round((longitudPared(planta, pared) - ancho) / 2)
}

export function anadirAbertura(doc: DocumentoDiseno, tipo: 'puerta' | 'ventana', pared: number): ResultadoEdicion {
  const ancho = tipo === 'puerta' ? 82 : 120
  const posicion = centrada(doc, pared, ancho)
  if (posicion === null) return falla(textos.edicion.cambioNoValido)
  const id = crypto.randomUUID()
  const abertura: Abertura = tipo === 'puerta'
    ? { id, tipo, pared, posicion, ancho, alto: 203, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' }
    : { id, tipo, pared, posicion, ancho, alto: 120, alturaSuelo: 90, abreHaciaDentro: true }
  return comprobarEstancia({ ...doc, aberturas: [...doc.aberturas, abertura] })
}

export function anadirEstructura(doc: DocumentoDiseno, tipo: 'columna' | 'viga' | 'radiador', pared = 0): ResultadoEdicion {
  const id = crypto.randomUUID()
  let nueva: Estructura
  if (tipo === 'radiador') {
    const posicion = centrada(doc, pared, 80)
    if (posicion === null) return falla(textos.edicion.cambioNoValido)
    nueva = { id, tipo, pared, posicion, ancho: 80, alto: 60, fondo: 10, alturaSuelo: 15 }
  } else {
    const xs = doc.estancia.planta.map(p => p.x)
    const ys = doc.estancia.planta.map(p => p.y)
    const cx = Math.round((Math.min(...xs) + Math.max(...xs)) / 2)
    const cy = Math.round((Math.min(...ys) + Math.max(...ys)) / 2)
    nueva = tipo === 'columna'
      ? { id, tipo, centro: { x: cx, y: cy }, ancho: 30, fondo: 30, rotacion: 0 }
      : { id, tipo, desde: { x: cx, y: Math.min(...ys) }, hasta: { x: cx, y: Math.max(...ys) }, ancho: 20, canto: 30 }
  }
  return comprobarEstancia({ ...doc, estructura: [...doc.estructura, nueva] })
}

export function editarAbertura(doc: DocumentoDiseno, id: string, cambios: Partial<Puerta> | Partial<Ventana>): ResultadoEdicion {
  const a = doc.aberturas.find(x => x.id === id)
  if (!a) return falla(textos.edicion.cambioNoValido)
  const nueva = { ...a, ...cambios, id: a.id, tipo: a.tipo } as Abertura
  return comprobarEstancia({ ...doc, aberturas: doc.aberturas.map(x => (x.id === id ? nueva : x)) })
}

export function editarEstructura(doc: DocumentoDiseno, id: string, cambios: Partial<Columna> | Partial<Viga> | Partial<Radiador>): ResultadoEdicion {
  const e = doc.estructura.find(x => x.id === id)
  if (!e) return falla(textos.edicion.cambioNoValido)
  const nueva = { ...e, ...cambios, id: e.id, tipo: e.tipo } as Estructura
  return comprobarEstancia({ ...doc, estructura: doc.estructura.map(x => (x.id === id ? nueva : x)) })
}

/** Cambia el alto o el grosor de pared comprobando, como toda edición de la estancia, que todo sigue cabiendo. */
export function editarEstancia(doc: DocumentoDiseno, cambios: { alto?: number; grosorPared?: number }): ResultadoEdicion {
  return comprobarEstancia({ ...doc, estancia: { ...doc.estancia, ...cambios } })
}

export function quitarDeEstancia(doc: DocumentoDiseno, id: string): DocumentoDiseno {
  if (!doc.aberturas.some(a => a.id === id) && !doc.estructura.some(e => e.id === id)) return doc
  return { ...doc, aberturas: doc.aberturas.filter(a => a.id !== id), estructura: doc.estructura.filter(e => e.id !== id) }
}
