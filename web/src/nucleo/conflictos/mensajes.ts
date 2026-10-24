import { capitalizar, conArticulo, deArticulo } from '../catalogo/tipos'

/** Nombre y género de lo que aparece en un mensaje. */
export interface Ref { nombre: string; genero: 'm' | 'f' }

export const PARED: Ref = { nombre: 'pared', genero: 'f' }

export const mensajeFueraDeEstancia = (a: Ref, n: number) => `${capitalizar(conArticulo(a.nombre, a.genero))} atraviesa la pared: sobran ${n} cm`
export const mensajeSolape = (a: Ref, b: Ref, n: number) => `${capitalizar(conArticulo(a.nombre, a.genero))} y ${conArticulo(b.nombre, b.genero)} se solapan ${n} cm`
export const mensajeTecho = (a: Ref, n: number) => `${capitalizar(conArticulo(a.nombre, a.genero))} no cabe bajo el techo: sobran ${n} cm`
export const mensajeViga = (a: Ref, n: number) => `${capitalizar(conArticulo(a.nombre, a.genero))} no cabe bajo la viga: sobran ${n} cm`
export const mensajeAperturaMueble = (zona: string, a: Ref, b: Ref, n: number) =>
  `${capitalizar(zona)} ${deArticulo(a.nombre, a.genero)} choca con ${conArticulo(b.nombre, b.genero)}: faltan ${n} cm`
export const mensajeAperturaEstancia = (zona: string, b: Ref, n: number) =>
  `${capitalizar(zona)} choca con ${conArticulo(b.nombre, b.genero)}: faltan ${n} cm`
export const mensajeTapaVentana = (a: Ref) => `${capitalizar(conArticulo(a.nombre, a.genero))} tapa la ventana`
export const mensajeTapaRadiador = (a: Ref) => `${capitalizar(conArticulo(a.nombre, a.genero))} tapa el radiador`
export const mensajePasoEstrecho = (a: Ref, b: Ref, p: number) => `Paso estrecho entre ${conArticulo(a.nombre, a.genero)} y ${conArticulo(b.nombre, b.genero)}: ${p} cm`
