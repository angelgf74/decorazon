import type { Elemento, Medidas, TipoEstancia } from '../modelo/documento'
import type { Punto } from '../geometria/vector'
import { capitalizar, type Catalogo, type DefinicionTipo } from './tipos'

/** Elemento recién colocado: medidas, variantes y colores por defecto. */
export function elementoNuevo(def: DefinicionTipo, posicion: Punto, id: string = crypto.randomUUID()): Elemento {
  return {
    id, tipo: def.id, posicion, rotacion: 0,
    medidas: { ancho: def.medidas.ancho.defecto, fondo: def.medidas.fondo.defecto, alto: def.medidas.alto.defecto },
    alturaSuelo: def.alturaSuelo,
    variantes: Object.fromEntries(def.variantes.map((v) => [v.clave, v.defecto])),
    colores: Object.fromEntries(def.zonasColor.map((z) => [z.clave, z.defecto])),
    origen: { tipo: 'generico' },
  }
}

/** El nombre que se enseña: el del producto si es de una tienda; si no, el del tipo con mayúscula. */
export function nombreDeElemento(def: DefinicionTipo | undefined, e: Elemento): string {
  if (e.origen.tipo === 'tienda') return e.origen.nombre
  return def ? capitalizar(def.nombre) : e.tipo
}

/** Redondea a entero y recorta a cada rango. */
export function ajustarMedidas(def: DefinicionTipo, m: Medidas): Medidas {
  const aj = (v: number, r: { min: number; max: number }) => Math.min(r.max, Math.max(r.min, Math.round(v)))
  return { ancho: aj(m.ancho, def.medidas.ancho), fondo: aj(m.fondo, def.medidas.fondo), alto: aj(m.alto, def.medidas.alto) }
}

/** Huellas del elemento en el plano. */
export function huellasEnPlanta(def: DefinicionTipo, e: Elemento): Punto[][] {
  return def.planta ? def.planta(e) : def.volumenes(e).map((v) => v.huella)
}

/** Punto del plano donde se escribe el nombre del elemento. */
export function nombreEnPlanta(def: DefinicionTipo, e: Elemento): Punto {
  return def.posicionNombre ? def.posicionNombre(e) : e.posicion
}

const porNombre = (a: DefinicionTipo, b: DefinicionTipo) => a.nombre.localeCompare(b.nombre, 'es')

/** Catálogo para la paleta: muebles de la estancia, el resto de muebles y la decoración, cada grupo por nombre. */
export function catalogoDeEstancia(catalogo: Catalogo, tipo: TipoEstancia): { deLaEstancia: DefinicionTipo[]; otros: DefinicionTipo[]; decoracion: DefinicionTipo[] } {
  const todos = [...catalogo.values()]
  const muebles = todos.filter((d) => d.categoria === 'mueble')
  return {
    deLaEstancia: muebles.filter((d) => d.estancias.includes(tipo)).sort(porNombre),
    otros: muebles.filter((d) => !d.estancias.includes(tipo)).sort(porNombre),
    decoracion: todos.filter((d) => d.categoria === 'decoracion').sort(porNombre),
  }
}
