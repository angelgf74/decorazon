import type { ZonaColor } from '../catalogo/tipos'

export type Vec3 = [number, number, number]
/** 'cristal' es el de las ventanas (transparente y con luz); 'mampara', el de las duchas (transparente, sin luz); 'vidrio' el de placas y hornos (oscuro y opaco). */
export type MaterialPBR = ZonaColor['material'] | 'cristal' | 'mampara' | 'pared' | 'suelo' | 'baldosa'

/**
 * Pieza en el sistema local del elemento, en cm: x a lo ancho, y a lo fondo (frente en +y), z desde e.alturaSuelo. `material` y `color`, si se indican, anulan los de la zona ('mampara' para el cristal de las duchas).
 * Una caja con `radio` (cm, como mucho medio lado menor) se pinta con las aristas redondeadas; los conflictos siguen usando los `volumenes`, no las piezas.
 */
export type PiezaLocal = { material?: ZonaColor['material'] | 'mampara'; color?: string } & (
  | { forma: 'caja'; x0: number; y0: number; z0: number; x1: number; y1: number; z1: number; zona: string; radio?: number }
  | { forma: 'cilindro'; cx: number; cy: number; r: number; z0: number; z1: number; zona: string }
)

/** Pieza en la escena, en metros (x, y arriba, z). */
export type Pieza3D = { material: MaterialPBR; color: string } & (
  | { forma: 'caja'; centro: Vec3; tamano: Vec3; giroY: number; radio?: number }
  | { forma: 'cilindro'; centro: Vec3; radio: number; alto: number }
  | { forma: 'prisma'; huella: [number, number][]; y0: number; y1: number }
)
