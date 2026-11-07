import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  documentoNuevo, redondearNumeros, type DocumentoDiseno, type FormaDePlanta, type ResultadoEdicion, type TipoEstancia,
} from '../../nucleo'
import { evento } from '../../analitica'
import { almacenamientoSeguro, leerDisenoLocal } from '../persistencia/local'
import { ORIGEN_ANONIMO, type Origen } from './origen'

export type Paso = 1 | 2
export type Vista = '2d' | '3d'
export type Seleccion =
  | { tipo: 'elemento' | 'abertura' | 'estructura'; id: string }
  | { tipo: 'vertice' | 'pared'; indice: number }
  /** Varios muebles a la vez (M-02): siempre dos o más; con uno es 'elemento'. */
  | { tipo: 'elementos'; ids: string[] }
  | null
export type EstadoGuardado = 'guardado' | 'pendiente' | 'error' | 'sinConexion' | 'conflicto'

export interface EstadoEditor {
  documento: DocumentoDiseno | null
  paso: Paso
  vista: Vista
  seleccion: Seleccion
  pasado: DocumentoDiseno[]
  futuro: DocumentoDiseno[]
  grupo: string | null
  aviso: string | null
  guardado: EstadoGuardado
  origen: Origen
  /** Versión del servidor que provocó el conflicto (412). */
  versionRemota: number | null
  /** «Seleccionar varios» del móvil (M-02): cada toque en un mueble lo añade o lo quita, como Mayúsculas+clic. */
  variosActivo: boolean
  activarVarios(activo: boolean): void
  crear(tipo: TipoEstancia, ancho: number, largo: number, alto: number, forma?: FormaDePlanta): void
  cargar(doc: DocumentoDiseno): void
  cambiar(f: (d: DocumentoDiseno) => DocumentoDiseno, grupo?: string): void
  intentar(f: (d: DocumentoDiseno) => ResultadoEdicion, grupo?: string): boolean
  terminarGrupo(): void
  deshacer(): void
  rehacer(): void
  seleccionar(s: Seleccion): void
  irAPaso(p: Paso): void
  cambiarVista(v: Vista): void
  descartar(): void
  marcarGuardado(g: EstadoGuardado): void
  abrirDelServidor(id: string, version: number, nombre: string, doc: DocumentoDiseno): void
  volverAAnonimo(st?: Storage | null): void
}

export const HISTORIAL_MAXIMO = 100

function seleccionValida(s: Seleccion, doc: DocumentoDiseno | null): Seleccion {
  if (s === null || doc === null) return null
  switch (s.tipo) {
    case 'vertice':
    case 'pared':
      return s.indice < doc.estancia.planta.length ? s : null
    case 'abertura':
      return doc.aberturas.some((x) => x.id === s.id) ? s : null
    case 'estructura':
      return doc.estructura.some((x) => x.id === s.id) ? s : null
    case 'elemento':
      return doc.elementos.some((x) => x.id === s.id) ? s : null
    case 'elementos': {
      const ids = s.ids.filter((id, i) => s.ids.indexOf(id) === i && doc.elementos.some((x) => x.id === id))
      if (ids.length === 0) return null
      return ids.length === 1 ? { tipo: 'elemento', id: ids[0]! } : ids.length === s.ids.length ? s : { tipo: 'elementos', ids }
    }
  }
}

/** Paso en el que se edita lo seleccionado: los elementos en el 2; la estancia en el 1. */
const pasoDe = (s: NonNullable<Seleccion>): Paso => (s.tipo === 'elemento' || s.tipo === 'elementos' ? 2 : 1)
/** Si lo seleccionado es de este paso: pared, esquina, abertura o estructura en el 1; elemento en el 2. */
export const seleccionDelPaso = (s: Seleccion | null, paso: Paso): boolean => s !== null && pasoDe(s) === paso

const vacio = () => ({ pasado: [], futuro: [], grupo: null, seleccion: null, aviso: null, variosActivo: false })

const pasoDeDocumento = (doc: DocumentoDiseno | null): Paso => (doc !== null && doc.elementos.length > 0 ? 2 : 1)

export function crearAlmacen(): StoreApi<EstadoEditor> {
  // Sin localStorage, el diseño anónimo que había al abrir uno del servidor solo queda aquí.
  let anonimoEnMemoria: DocumentoDiseno | null = null

  const tienda = createStore<EstadoEditor>()((set, get) => ({
    documento: null,
    paso: 1,
    vista: '2d',
    seleccion: null,
    pasado: [],
    futuro: [],
    grupo: null,
    aviso: null,
    guardado: 'guardado',
    origen: ORIGEN_ANONIMO,
    versionRemota: null,
    variosActivo: false,

    crear: (tipo, ancho, largo, alto, forma) => {
      set({ ...vacio(), documento: redondearNumeros(documentoNuevo(tipo, ancho, largo, alto, forma)), paso: 1 })
      evento('estancia-creada', { tipo, forma: forma?.forma ?? 'rectangulo' })
    },
    cargar: (doc) => set({ ...vacio(), documento: doc, paso: pasoDeDocumento(doc) }),
    descartar: () => set({ ...vacio(), documento: null, paso: 1 }),

    cambiar: (f, grupo) => {
      const e = get()
      if (e.documento === null) return
      const resultado = f(e.documento)
      if (resultado === e.documento) return
      const nuevo = redondearNumeros(resultado)
      const agrupado = grupo !== undefined && grupo === e.grupo
      set({
        documento: nuevo,
        pasado: agrupado ? e.pasado : [...e.pasado, e.documento].slice(-HISTORIAL_MAXIMO),
        futuro: agrupado ? e.futuro : [],
        grupo: grupo ?? null,
        seleccion: seleccionValida(e.seleccion, nuevo),
        aviso: null,
      })
    },

    intentar: (f, grupo) => {
      const e = get()
      if (e.documento === null) return false
      const r = f(e.documento)
      if (!r.ok) {
        set({ aviso: r.motivo })
        return false
      }
      e.cambiar(() => r.documento, grupo)
      return true
    },

    terminarGrupo: () => set({ grupo: null }),

    deshacer: () => {
      const e = get()
      const anterior = e.pasado[e.pasado.length - 1]
      if (e.documento === null || anterior === undefined) return
      set({
        documento: anterior,
        pasado: e.pasado.slice(0, -1),
        futuro: [...e.futuro, e.documento],
        grupo: null,
        seleccion: seleccionValida(e.seleccion, anterior),
      })
    },

    rehacer: () => {
      const e = get()
      const siguiente = e.futuro[e.futuro.length - 1]
      if (e.documento === null || siguiente === undefined) return
      set({
        documento: siguiente,
        futuro: e.futuro.slice(0, -1),
        pasado: [...e.pasado, e.documento].slice(-HISTORIAL_MAXIMO),
        grupo: null,
        seleccion: seleccionValida(e.seleccion, siguiente),
      })
    },

    // Soltar la selección (tocar el fondo, Escape) también termina el modo «Seleccionar varios».
    seleccionar: (s) => set({ seleccion: seleccionValida(s, get().documento), ...(s === null && { variosActivo: false }) }),
    activarVarios: (variosActivo) => set({ variosActivo }),
    irAPaso: (paso) => set((e) => ({ paso, seleccion: e.seleccion !== null && pasoDe(e.seleccion) !== paso ? null : e.seleccion, variosActivo: paso === 2 && e.variosActivo })),
    cambiarVista: (vista) => {
      const entra = vista === '3d' && get().vista !== '3d'
      set({ vista })
      if (entra) evento('vista-3d')
    },
    marcarGuardado: (guardado) => set({ guardado }),

    abrirDelServidor: (id, version, nombre, doc) => {
      if (get().origen.tipo === 'anonimo') anonimoEnMemoria = get().documento
      set({
        ...vacio(), documento: doc, paso: pasoDeDocumento(doc), guardado: 'guardado', versionRemota: null,
        origen: { tipo: 'servidor', id, version, nombre },
      })
    },

    volverAAnonimo: (st = almacenamientoSeguro()) => {
      if (get().origen.tipo === 'anonimo') return
      const doc = st === null ? anonimoEnMemoria : leerDisenoLocal(st)
      anonimoEnMemoria = null
      set({
        ...vacio(), documento: doc, paso: pasoDeDocumento(doc), origen: ORIGEN_ANONIMO, versionRemota: null,
        guardado: st === null ? 'error' : 'guardado',
      })
    },
  }))
  // «Seleccionar varios» (M-02) solo tiene sentido con algo seleccionado y en 2D: se apaga en cuanto no queda selección
  // (también al deshacer, borrar o cambiar de diseño) o se pasa a 3D. Un solo sitio para todos los cambios de estado.
  tienda.subscribe((e) => {
    if (e.variosActivo && (e.seleccion === null || e.vista === '3d')) tienda.setState({ variosActivo: false })
  })
  return tienda
}

export const almacen = crearAlmacen()

/** Restaura el estado inicial del almacén global; los tests de componentes lo llaman en `beforeEach`. */
export function reiniciarAlmacen(): void {
  almacen.setState(almacen.getInitialState(), true)
}

export function useEditor<T>(selector: (e: EstadoEditor) => T): T {
  return useStore(almacen, selector)
}
