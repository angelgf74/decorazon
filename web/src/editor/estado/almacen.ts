import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  documentoNuevo, redondearNumeros, type DocumentoDiseno, type ResultadoEdicion, type TipoEstancia,
} from '../../nucleo'

export type Paso = 1 | 2
export type Vista = '2d' | '3d'
export type Seleccion =
  | { tipo: 'elemento' | 'abertura' | 'estructura'; id: string }
  | { tipo: 'vertice' | 'pared'; indice: number }
  | null
export type EstadoGuardado = 'guardado' | 'pendiente' | 'error'

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
  crear(tipo: TipoEstancia, ancho: number, largo: number, alto: number): void
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
  }
}

/** Paso en el que se edita lo seleccionado: los elementos en el 2; la estancia en el 1. */
const pasoDe = (s: NonNullable<Seleccion>): Paso => (s.tipo === 'elemento' ? 2 : 1)

const vacio = () => ({ pasado: [], futuro: [], grupo: null, seleccion: null, aviso: null })

export function crearAlmacen(): StoreApi<EstadoEditor> {
  return createStore<EstadoEditor>()((set, get) => ({
    documento: null,
    paso: 1,
    vista: '2d',
    seleccion: null,
    pasado: [],
    futuro: [],
    grupo: null,
    aviso: null,
    guardado: 'guardado',

    crear: (tipo, ancho, largo, alto) =>
      set({ ...vacio(), documento: redondearNumeros(documentoNuevo(tipo, ancho, largo, alto)), paso: 1 }),
    cargar: (doc) => set({ ...vacio(), documento: doc, paso: doc.elementos.length > 0 ? 2 : 1 }),
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

    seleccionar: (s) => set({ seleccion: seleccionValida(s, get().documento) }),
    irAPaso: (paso) => set((e) => ({ paso, seleccion: e.seleccion !== null && pasoDe(e.seleccion) !== paso ? null : e.seleccion })),
    cambiarVista: (vista) => set({ vista }),
    marcarGuardado: (guardado) => set({ guardado }),
  }))
}

export const almacen = crearAlmacen()

/** Restaura el estado inicial del almacén global; los tests de componentes lo llaman en `beforeEach`. */
export function reiniciarAlmacen(): void {
  almacen.setState(almacen.getInitialState(), true)
}

export function useEditor<T>(selector: (e: EstadoEditor) => T): T {
  return useStore(almacen, selector)
}
