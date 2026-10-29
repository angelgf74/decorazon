import { ajustarMedidas, elementoNuevo } from '../catalogo/elemento'
import type { Catalogo } from '../catalogo/tipos'
import type { Punto } from '../geometria/vector'
import type { DocumentoDiseno, Elemento, Medidas } from '../modelo/documento'
import { imantar, normalizarGiro, paredesTocadas } from './iman'

const DESPLAZAMIENTO_COPIA_CM = 20

function conIman(doc: DocumentoDiseno, catalogo: Catalogo, e: Elemento, libre: boolean): Elemento {
  const r = imantar(doc, catalogo, e, { libre })
  return { ...e, posicion: r.posicion, rotacion: r.rotacion }
}
const reemplazar = (doc: DocumentoDiseno, e: Elemento): DocumentoDiseno =>
  ({ ...doc, elementos: doc.elementos.map(x => (x.id === e.id ? e : x)) })
const buscar = (doc: DocumentoDiseno, id: string) => doc.elementos.find(e => e.id === id)

export function anadirElemento(doc: DocumentoDiseno, catalogo: Catalogo, tipo: string, posicion: Punto): { documento: DocumentoDiseno; id: string } {
  const def = catalogo.get(tipo)
  if (!def) throw new Error(`tipo de elemento desconocido: ${tipo}`)
  const e = conIman(doc, catalogo, elementoNuevo(def, { ...posicion }), false)
  return { documento: { ...doc, elementos: [...doc.elementos, e] }, id: e.id }
}

export function moverElemento(doc: DocumentoDiseno, catalogo: Catalogo, id: string, posicion: Punto, rotacion: number, libre: boolean): DocumentoDiseno {
  const e = buscar(doc, id)
  if (!e) return doc
  return reemplazar(doc, conIman(doc, catalogo, { ...e, posicion: { ...posicion }, rotacion }, libre))
}

export function editarElemento(
  doc: DocumentoDiseno, catalogo: Catalogo, id: string,
  cambios: { medidas?: Partial<Medidas>; rotacion?: number; alturaSuelo?: number; variantes?: Record<string, string | number | boolean>; colores?: Record<string, string> },
): DocumentoDiseno {
  const e = buscar(doc, id)
  const def = e && catalogo.get(e.tipo)
  if (!e || !def) return doc
  const nuevasMedidas = Object.fromEntries(Object.entries(cambios.medidas ?? {}).filter(([, v]) => Number.isFinite(v)))
  const medidas = ajustarMedidas(def, { ...e.medidas, ...nuevasMedidas })
  const rotacion = Number.isFinite(cambios.rotacion) ? normalizarGiro(Math.round(cambios.rotacion!)) : e.rotacion
  let alturaSuelo = e.alturaSuelo
  if (def.alturaSueloEditable) {
    const pedida = Number.isFinite(cambios.alturaSuelo) ? Math.round(cambios.alturaSuelo!) : e.alturaSuelo
    alturaSuelo = Math.max(0, Math.min(doc.estancia.alto - medidas.alto, pedida))
  }
  const editado: Elemento = {
    ...e, medidas, rotacion, alturaSuelo,
    variantes: { ...e.variantes, ...cambios.variantes },
    colores: { ...e.colores, ...cambios.colores },
  }
  // Colores, variantes o altura al suelo no mueven el elemento. Con medidas o giro nuevos, sigue a ras de las paredes
  // que tocaba; las que solo tenía cerca no lo atraen.
  const mismaForma = rotacion === e.rotacion
    && (Object.keys(medidas) as (keyof Medidas)[]).every(k => medidas[k] === e.medidas[k])
  const paredes = mismaForma ? [] : paredesTocadas(doc, e)
  if (paredes.length === 0) return reemplazar(doc, editado)
  const r = imantar(doc, catalogo, editado, { libre: rotacion % 90 !== 0, paredes })
  return reemplazar(doc, { ...editado, posicion: r.posicion, rotacion: r.rotacion })
}

/** Copia desplazada e imantada. Con un id inexistente devuelve el documento sin cambios y el mismo id. */
export function duplicarElemento(doc: DocumentoDiseno, catalogo: Catalogo, id: string): { documento: DocumentoDiseno; id: string } {
  const e = buscar(doc, id)
  if (!e) return { documento: doc, id }
  const copia: Elemento = {
    ...e,
    id: crypto.randomUUID(),
    posicion: { x: e.posicion.x + DESPLAZAMIENTO_COPIA_CM, y: e.posicion.y + DESPLAZAMIENTO_COPIA_CM },
    medidas: { ...e.medidas },
    variantes: { ...e.variantes },
    colores: { ...e.colores },
    origen: { ...e.origen },
  }
  const imantada = conIman(doc, catalogo, copia, true)
  return { documento: { ...doc, elementos: [...doc.elementos, imantada] }, id: imantada.id }
}

export function quitarElemento(doc: DocumentoDiseno, id: string): DocumentoDiseno {
  if (!buscar(doc, id)) return doc
  return { ...doc, elementos: doc.elementos.filter(e => e.id !== id) }
}
