import type { ZonaColor } from '../catalogo/tipos'

export type Vec3 = [number, number, number]
export type MaterialPBR = ZonaColor['material'] | 'pared' | 'suelo'

/** Pieza en el sistema local del elemento, en cm: x a lo ancho, y a lo fondo (frente en +y), z desde e.alturaSuelo. `material` y `color`, si se indican, anulan los de la zona. */
export type PiezaLocal = { material?: ZonaColor['material']; color?: string } & (
  | { forma: 'caja'; x0: number; y0: number; z0: number; x1: number; y1: number; z1: number; zona: string }
  | { forma: 'cilindro'; cx: number; cy: number; r: number; z0: number; z1: number; zona: string }
)

/** Pieza en la escena, en metros (x, y arriba, z). */
export type Pieza3D = { material: MaterialPBR; color: string } & (
  | { forma: 'caja'; centro: Vec3; tamano: Vec3; giroY: number }
  | { forma: 'cilindro'; centro: Vec3; radio: number; alto: number }
  | { forma: 'prisma'; huella: [number, number][]; y0: number; y1: number }
)
