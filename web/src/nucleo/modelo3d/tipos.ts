import type { ZonaColor } from '../catalogo/tipos'

export type Vec3 = [number, number, number]
/** 'cristal' es el de las ventanas (transparente y con luz); 'mampara', el de las duchas (transparente, sin luz); 'vidrio' el de placas y hornos (oscuro y opaco). */
export type MaterialPBR = ZonaColor['material'] | 'cristal' | 'mampara' | 'pared' | 'suelo' | 'baldosa'

/** Plano del contorno de una extrusión: planta (x, y) sube en z; alzado (x, z) va a lo fondo en y; perfil (y, z) va a lo ancho en x. */
export type PlanoExtrusion = 'planta' | 'alzado' | 'perfil'

/**
 * Pieza en el sistema local del elemento, en cm: x a lo ancho, y a lo fondo (frente en +y), z desde e.alturaSuelo. `material` y `color`, si se indican, anulan los de la zona ('mampara' para el cristal de las duchas).
 * Una caja con `radio` (cm, como mucho medio lado menor) se pinta con las aristas redondeadas; los conflictos siguen usando los `volumenes`, no las piezas.
 * - `revolucion`: el `perfil` ([radio, z]) gira alrededor del eje vertical que pasa por (cx, cy). Se recorre en sentido antihorario
 *   con el radio a la derecha y z arriba (sube por fuera y baja por dentro). `lados` (24) lo facetan: con 4 es una pirámide con las
 *   caras alineadas con los ejes y el radio llega a las esquinas. `escalaY` estira a lo fondo (un óvalo).
 * - `extrusion`: un `contorno` (y sus `huecos`) en un `plano`, extruido de `desde` a `hasta` en el eje que falta.
 * - `tubo`: un tubo de radio `r` por los `puntos` ([x, y, z]), con los codos redondeados con radio `codo`; `cerrado` vuelve al primero.
 */
export type PiezaLocal = { material?: ZonaColor['material'] | 'mampara'; color?: string } & (
  | { forma: 'caja'; x0: number; y0: number; z0: number; x1: number; y1: number; z1: number; zona: string; radio?: number }
  | { forma: 'cilindro'; cx: number; cy: number; r: number; z0: number; z1: number; zona: string }
  | { forma: 'revolucion'; cx: number; cy: number; perfil: [number, number][]; lados?: number; escalaY?: number; zona: string }
  | { forma: 'extrusion'; plano: PlanoExtrusion; contorno: [number, number][]; huecos?: [number, number][][]; desde: number; hasta: number; zona: string }
  | { forma: 'tubo'; puntos: [number, number, number][]; r: number; codo?: number; cerrado?: boolean; zona: string }
)

/** Las formas nuevas viajan en el sistema local del elemento (en metros) y el mueble entero se coloca en `origen` con `giroY`. */
type EnElemento = { origen: Vec3; giroY: number }

/**
 * Pieza en la escena, en metros (x, y arriba, z). Revolución, extrusión y tubo conservan sus datos locales (en metros, con los ejes
 * del plano del elemento: x, y a lo fondo, z arriba); `geometrias` los pasa a los de la escena.
 */
export type Pieza3D = { material: MaterialPBR; color: string } & (
  | { forma: 'caja'; centro: Vec3; tamano: Vec3; giroY: number; radio?: number }
  | { forma: 'cilindro'; centro: Vec3; radio: number; alto: number }
  | { forma: 'prisma'; huella: [number, number][]; y0: number; y1: number }
  | ({ forma: 'revolucion'; centro: [number, number]; perfil: [number, number][]; lados: number; escalaY: number } & EnElemento)
  | ({ forma: 'extrusion'; plano: PlanoExtrusion; contorno: [number, number][]; huecos: [number, number][][]; desde: number; hasta: number } & EnElemento)
  | ({ forma: 'tubo'; puntos: Vec3[]; radio: number; codo: number; cerrado: boolean } & EnElemento)
)
