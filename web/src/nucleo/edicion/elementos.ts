import { ajustarMedidas, elementoNuevo, esVarianteDeLado } from '../catalogo/elemento'
import { medidasExtraDe, valorMedidaExtra, valorVariante, type Catalogo } from '../catalogo/tipos'
import type { Punto } from '../geometria/vector'
import { LIMITE_NOMBRE_ELEMENTO, type DocumentoDiseno, type Elemento, type Medidas, type OrigenTienda } from '../modelo/documento'
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

/** Un bloqueado no se mueve ni se gira: el mismo documento, para que el historial no apunte un paso vacío. */
export function moverElemento(doc: DocumentoDiseno, catalogo: Catalogo, id: string, posicion: Punto, rotacion: number, libre: boolean): DocumentoDiseno {
  const e = buscar(doc, id)
  if (!e || e.bloqueado) return doc
  return reemplazar(doc, conIman(doc, catalogo, { ...e, posicion: { ...posicion }, rotacion }, libre))
}

/** Desplaza el elemento (dx, dy) cm **sin imán**: es lo que hacen las flechas del teclado, un ajuste fino que el imán desharía. */
export function desplazarElemento(doc: DocumentoDiseno, id: string, dx: number, dy: number): DocumentoDiseno {
  const e = buscar(doc, id)
  if (!e || e.bloqueado) return doc
  const redondear = (n: number) => Math.round(n * 100) / 100
  return reemplazar(doc, { ...e, posicion: { x: redondear(e.posicion.x + dx), y: redondear(e.posicion.y + dy) } })
}

/** Bloquea o libera el elemento. Libre, el campo no se guarda (los diseños de antes no lo llevan). */
export function bloquearElemento(doc: DocumentoDiseno, id: string, bloqueado: boolean): DocumentoDiseno {
  const e = buscar(doc, id)
  if (!e || (e.bloqueado === true) === bloqueado) return doc
  const { bloqueado: _quitado, ...libre } = e
  return reemplazar(doc, bloqueado ? { ...libre, bloqueado: true } : libre)
}

/** Nombre propio, sin espacios a los lados y cortado al límite; vacío o solo espacios quita el campo. */
export function renombrarElemento(doc: DocumentoDiseno, id: string, nombre: string): DocumentoDiseno {
  const e = buscar(doc, id)
  if (!e) return doc
  const limpio = nombre.trim().slice(0, LIMITE_NOMBRE_ELEMENTO).trimEnd()
  if ((e.nombre ?? '') === limpio) return doc
  const { nombre: _quitado, ...sinNombre } = e
  return reemplazar(doc, limpio === '' ? sinNombre : { ...sinNombre, nombre: limpio })
}

/** Cambia de lado todas las variantes de lado que tengan un lado elegido (izquierda ↔ derecha); si ninguna, el mismo documento. */
export function voltearElemento(doc: DocumentoDiseno, catalogo: Catalogo, id: string): DocumentoDiseno {
  const e = buscar(doc, id)
  const def = e && catalogo.get(e.tipo)
  if (!e || !def) return doc
  const cambios: Record<string, string> = {}
  for (const v of def.variantes.filter(esVarianteDeLado)) {
    const actual = valorVariante(def, e, v.clave)
    if (actual === 'izquierda') cambios[v.clave] = 'derecha'
    else if (actual === 'derecha') cambios[v.clave] = 'izquierda'
  }
  if (Object.keys(cambios).length === 0) return doc
  return editar(doc, catalogo, id, { variantes: cambios })
}

type CambiosElemento = {
  medidas?: Partial<Medidas>; medidasExtra?: Record<string, number>; rotacion?: number; alturaSuelo?: number
  variantes?: Record<string, string | number | boolean>; colores?: Record<string, string>
}

/** Las medidas de un mueble de tienda son las del producto: no se cambian aquí, solo al guardar el producto (vincularTienda). */
export function editarElemento(doc: DocumentoDiseno, catalogo: Catalogo, id: string, cambios: CambiosElemento): DocumentoDiseno {
  const e = buscar(doc, id)
  if (e?.origen.tipo === 'tienda') return editar(doc, catalogo, id, { ...cambios, medidas: undefined, medidasExtra: undefined })
  return editar(doc, catalogo, id, cambios)
}

/** Hace del elemento ese producto de tienda, con sus medidas (recortadas al rango del tipo). */
export function vincularTienda(
  doc: DocumentoDiseno, catalogo: Catalogo, id: string, origen: OrigenTienda, medidas: Medidas, medidasExtra?: Record<string, number>,
): DocumentoDiseno {
  const e = buscar(doc, id)
  if (!e || !catalogo.get(e.tipo)) return doc
  return editar(reemplazar(doc, { ...e, origen: { ...origen } }), catalogo, id, { medidas, medidasExtra })
}

/** Vuelve a ser un mueble genérico, con las medidas que tenía el producto. */
export function desvincularTienda(doc: DocumentoDiseno, id: string): DocumentoDiseno {
  const e = buscar(doc, id)
  if (!e || e.origen.tipo !== 'tienda') return doc
  return reemplazar(doc, { ...e, origen: { tipo: 'generico' } })
}

function editar(doc: DocumentoDiseno, catalogo: Catalogo, id: string, cambios: CambiosElemento): DocumentoDiseno {
  const e = buscar(doc, id)
  const def = e && catalogo.get(e.tipo)
  if (!e || !def) return doc
  const nuevasMedidas = Object.fromEntries(Object.entries(cambios.medidas ?? {}).filter(([, v]) => Number.isFinite(v)))
  const medidas = ajustarMedidas(def, { ...e.medidas, ...nuevasMedidas })
  // Un bloqueado no gira (el panel no ofrece el campo; por si llega de otro camino).
  const rotacion = Number.isFinite(cambios.rotacion) && !e.bloqueado ? normalizarGiro(Math.round(cambios.rotacion!)) : e.rotacion
  let alturaSuelo = e.alturaSuelo
  if (def.alturaSueloEditable) {
    const pedida = Number.isFinite(cambios.alturaSuelo) ? Math.round(cambios.alturaSuelo!) : e.alturaSuelo
    alturaSuelo = Math.max(0, Math.min(doc.estancia.alto - medidas.alto, pedida))
  }
  // Las medidas extra del tipo, con los cambios recortados a su rango (las que no son del tipo no se guardan).
  const nuevasExtra = Object.fromEntries(Object.entries(cambios.medidasExtra ?? {}).filter(([, v]) => Number.isFinite(v)))
  const extra = def.medidasExtra?.length
    ? { medidasExtra: medidasExtraDe(def, { ...e, medidas, medidasExtra: { ...medidasExtraDe(def, e), ...nuevasExtra } }) }
    : {}
  const editado: Elemento = {
    ...e, medidas, rotacion, alturaSuelo, ...extra,
    variantes: { ...e.variantes, ...cambios.variantes },
    colores: { ...e.colores, ...cambios.colores },
  }
  // Colores, variantes o altura al suelo no mueven el elemento. Con medidas o giro nuevos, sigue a ras de las paredes
  // que tocaba; las que solo tenía cerca no lo atraen.
  const mismaForma = rotacion === e.rotacion
    && (Object.keys(medidas) as (keyof Medidas)[]).every(k => medidas[k] === e.medidas[k])
    // Por los valores que se dibujan, no por el texto: un esquinero de antes no trae el campo y jsonb reordena las claves.
    && (def.medidasExtra ?? []).every((m) => valorMedidaExtra(def, editado, m.clave) === valorMedidaExtra(def, e, m.clave))
  const paredes = mismaForma ? [] : paredesTocadas(doc, e)
  if (paredes.length === 0) return reemplazar(doc, editado)
  const r = imantar(doc, catalogo, editado, { libre: rotacion % 90 !== 0, paredes })
  return reemplazar(doc, { ...editado, posicion: r.posicion, rotacion: r.rotacion })
}

/**
 * El mismo mueble como otro tipo (un armario que en realidad es un esquinero): conserva id, posición, giro y producto;
 * las medidas se recortan al rango del tipo nuevo; variantes por defecto; los colores de las zonas con la misma clave.
 */
export function cambiarTipo(doc: DocumentoDiseno, catalogo: Catalogo, id: string, tipo: string): DocumentoDiseno {
  const e = buscar(doc, id)
  const def = catalogo.get(tipo)
  if (!e || !def || e.tipo === tipo) return doc
  const base = elementoNuevo(def, { ...e.posicion }, e.id)
  const medidas = ajustarMedidas(def, e.medidas)
  // La altura que tenía solo vale si los dos tipos la dejan elegir; si no, la del tipo nuevo (de una cómoda a un cuadro, la del cuadro).
  const conAltura = def.alturaSueloEditable && catalogo.get(e.tipo)?.alturaSueloEditable === true
  const alturaSuelo = conAltura ? Math.max(0, Math.min(doc.estancia.alto - medidas.alto, e.alturaSuelo)) : def.alturaSuelo
  const cambiado: Elemento = {
    ...base, rotacion: e.rotacion, medidas, alturaSuelo,
    colores: Object.fromEntries(def.zonasColor.map((z) => [z.clave, e.colores[z.clave] ?? z.defecto])),
    origen: { ...e.origen },
    ...(e.bloqueado && { bloqueado: true }),
    ...(e.nombre !== undefined && { nombre: e.nombre }),
  }
  return reemplazar(doc, conIman(doc, catalogo, cambiado, e.rotacion % 90 !== 0))
}

/** Copia desplazada e imantada, con el nombre propio pero libre (se duplica para colocar la copia). Con un id inexistente, el documento sin cambios y el mismo id. */
export function duplicarElemento(doc: DocumentoDiseno, catalogo: Catalogo, id: string): { documento: DocumentoDiseno; id: string } {
  const e = buscar(doc, id)
  if (!e) return { documento: doc, id }
  const { bloqueado: _quitado, ...original } = e
  const copia: Elemento = {
    ...original,
    id: crypto.randomUUID(),
    posicion: { x: e.posicion.x + DESPLAZAMIENTO_COPIA_CM, y: e.posicion.y + DESPLAZAMIENTO_COPIA_CM },
    medidas: { ...e.medidas },
    variantes: { ...e.variantes },
    colores: { ...e.colores },
    origen: { ...e.origen },
    ...(e.medidasExtra && { medidasExtra: { ...e.medidasExtra } }),
  }
  const imantada = conIman(doc, catalogo, copia, true)
  return { documento: { ...doc, elementos: [...doc.elementos, imantada] }, id: imantada.id }
}

export function quitarElemento(doc: DocumentoDiseno, id: string): DocumentoDiseno {
  if (!buscar(doc, id)) return doc
  return { ...doc, elementos: doc.elementos.filter(e => e.id !== id) }
}
