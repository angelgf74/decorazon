import {
  ExtrudeGeometry, LatheGeometry, LineCurve3, Path, QuadraticBezierCurve3, Shape, ShapeGeometry, TubeGeometry, Vector2, Vector3,
  type BufferGeometry, type Curve,
} from 'three'
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { contornoEncogido, type PlanoExtrusion, type Punto, type Vec3 } from '../../nucleo'

/** Caras que se encuentran a más de esto quedan con el canto vivo; por debajo, la superficie se sombrea lisa. */
const PLIEGUE = (35 * Math.PI) / 180
const LADOS_TUBO = 12
const TRAMOS_CODO = 8
/** Tramos del bisel de una extrusión con radio: 3 por cuarto de vuelta, como la caja redondeada (30° cada uno, por debajo del pliegue). */
const SEGMENTOS_BISEL = 3

/** Shape en XY con (x, −z): al girar −π/2 en X cae en (x, z) de la escena y su normal mira a +y. */
function forma(puntos: [number, number][]): Shape {
  const s = new Shape()
  puntos.forEach(([x, z], k) => (k === 0 ? s.moveTo(x, -z) : s.lineTo(x, -z)))
  s.closePath()
  return s
}

export function geometriaPrisma(huella: [number, number][], y0: number, y1: number): BufferGeometry {
  const g = new ExtrudeGeometry(forma(huella), { depth: y1 - y0, bevelEnabled: false })
  g.rotateX(-Math.PI / 2)
  g.translate(0, y0, 0)
  return g
}

/** Planta en cm del plano → suelo en metros a y = 0. */
export function geometriaSuelo(planta: Punto[]): BufferGeometry {
  const g = new ShapeGeometry(forma(planta.map((p): [number, number] => [p.x / 100, p.y / 100])))
  g.rotateX(-Math.PI / 2)
  return g
}

/**
 * Receptor de las sombras acumuladas (`SombrasSuaves`): la planta en el plano local del receptor de drei (que ya va girado
 * −π/2 en X: local (x, y) es mundo (x, −z)), relativa a `centro`, con las uv de 0 a 1 sobre su caja. El horneado de drei
 * desenvuelve por uv, así que valen cualquier forma y cualquier uv dentro de 0..1 mientras el material use las mismas.
 */
export function geometriaReceptor(planta: Punto[], centro: Vec3): BufferGeometry {
  const g = new ShapeGeometry(forma(planta.map((p): [number, number] => [p.x / 100 - centro[0], p.y / 100 - centro[2]])))
  g.computeBoundingBox()
  const b = g.boundingBox!
  const posicion = g.getAttribute('position')
  const uv = g.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (posicion.getX(i) - b.min.x) / (b.max.x - b.min.x), (posicion.getY(i) - b.min.y) / (b.max.y - b.min.y))
  uv.needsUpdate = true
  return g
}

/**
 * Coordenadas de textura en metros (M-12): con las de three cada cara va de 0 a 1 y la veta de un tablero de 2 m
 * saldría igual de ancha que la de un tirador. Las caras se proyectan sobre el plano de su normal dominante; en un
 * cilindro (`cilindro`: su radio) el lateral da la vuelta en 2πr y las tapas miden su diámetro. Cambia `g` y lo devuelve.
 */
export function uvsEnMetros<G extends BufferGeometry>(g: G, opciones: { cilindro?: number } = {}): G {
  const posicion = g.getAttribute('position')
  const normal = g.getAttribute('normal')
  const uv = g.getAttribute('uv')
  g.computeBoundingBox()
  const alto = g.boundingBox!.max.y - g.boundingBox!.min.y
  for (let i = 0; i < uv.count; i++) {
    const [nx, ny, nz] = [Math.abs(normal.getX(i)), Math.abs(normal.getY(i)), Math.abs(normal.getZ(i))]
    const [x, y, z] = [posicion.getX(i), posicion.getY(i), posicion.getZ(i)]
    if (opciones.cilindro !== undefined) {
      const r = opciones.cilindro
      if (ny < 0.5) uv.setXY(i, uv.getX(i) * 2 * Math.PI * r, uv.getY(i) * alto)
      else uv.setXY(i, uv.getX(i) * 2 * r, uv.getY(i) * 2 * r)
    } else if (nx >= ny && nx >= nz) uv.setXY(i, z, y)
    else if (ny >= nz) uv.setXY(i, x, z)
    else uv.setXY(i, x, y)
  }
  uv.needsUpdate = true
  return g
}

/**
 * Normales lisas salvo en los pliegues de más de `PLIEGUE` (el canto de una tapa, el borde de un tablero). Se calculan en cm:
 * `toCreasedNormals` une los vértices que coinciden a 1/100 de unidad, y en metros eso juntaría las dos caras de una pantalla de 5 mm.
 */
function conPliegues(g: BufferGeometry): BufferGeometry {
  g.scale(100, 100, 100)
  const r = toCreasedNormals(g, PLIEGUE)
  if (r !== g) g.dispose()
  return r.scale(0.01, 0.01, 0.01)
}

/**
 * Revolución (metros, ejes del plano del elemento): el `perfil` [radio, z] gira alrededor del eje vertical que pasa por `centro`
 * ([x, y] del plano). Los meridianos empiezan a medio lado (con 4 lados, caras en los ejes, como `angulosRevolucion` del núcleo).
 * Textura en metros: la vuelta mide 2π·radio mayor y el perfil, su recorrido.
 */
export function geometriaRevolucion(centro: [number, number], perfil: [number, number][], lados: number, escalaY: number): BufferGeometry {
  const g = new LatheGeometry(perfil.map(([r, z]) => new Vector2(r, z)), lados, Math.PI / lados)
  const radio = Math.max(...perfil.map(([r]) => r))
  const recorrido = perfil.map((_, j) => perfil.slice(1, j + 1).reduce((s, [r, z], k) => s + Math.hypot(r - perfil[k]![0], z - perfil[k]![1]), 0))
  const uv = g.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2 * Math.PI * radio, recorrido[i % perfil.length]!)
  g.scale(1, 1, escalaY)
  g.translate(centro[0], 0, centro[1])
  return conPliegues(g)
}

const vector2 = ([a, b]: [number, number]) => new Vector2(a, b)

/**
 * Extrusión (metros, ejes del plano del elemento) de un contorno con huecos, de `desde` a `hasta`. `ExtrudeGeometry` extruye en +z
 * un contorno en XY; cada plano lo lleva a su sitio con un giro (sin espejos, que darían la vuelta a las caras):
 * - planta (x, y) → x y z de la escena, sube en y: gira +π/2 en X (la extrusión queda hacia abajo) y se lleva a `hasta`. No se
 *   cambia el signo de y como en `geometriaPrisma`: con huecos, `ExtrudeGeometry` triangula mal el contorno al revés;
 * - alzado (x, z) → x y la altura, va en z: tal cual;
 * - perfil (y, z) → z y la altura, va en x: gira −π/2 en Y (la extrusión queda en −x) y se lleva a `hasta`.
 * Las coordenadas de textura son las del contorno: metros.
 * Con `radio`, el bisel de three redondea los cantos: crece `radio` hacia fuera del contorno y de cada tapa, así que se extruye el
 * contorno encogido (`contornoEncogido`) entre `desde + radio` y `hasta − radio` y el bisel lo devuelve a su sitio.
 */
export function geometriaExtrusion(plano: PlanoExtrusion, contorno: [number, number][], huecos: [number, number][][], desde: number, hasta: number, radio = 0): BufferGeometry {
  const s = new Shape((radio > 0 ? contornoEncogido(contorno, radio) : contorno).map(vector2))
  s.holes = huecos.map((h) => new Path(h.map(vector2)))
  const bisel = radio > 0 ? { bevelEnabled: true, bevelThickness: radio, bevelSize: radio, bevelOffset: 0, bevelSegments: SEGMENTOS_BISEL } : { bevelEnabled: false }
  const g = new ExtrudeGeometry(s, { depth: hasta - desde - 2 * radio, ...bisel })
  // El bisel deja la extrusión entre −radio y depth + radio en z.
  if (plano === 'planta') g.rotateX(Math.PI / 2).translate(0, hasta - radio, 0)
  else if (plano === 'alzado') g.translate(0, 0, desde + radio)
  else g.rotateY(-Math.PI / 2).translate(hasta - radio, 0, 0)
  return conPliegues(g)
}

/** Tramos de una poligonal con los codos redondeados (una curva de Bézier entre los dos puntos a `codo` de cada esquina). */
function tramosConCodos(p: Vector3[], codo: number, cerrado: boolean): Curve<Vector3>[] {
  const n = p.length
  const esquina = (i: number) => {
    const v = p[i]!
    const antes = p[(i - 1 + n) % n]!
    const despues = p[(i + 1) % n]!
    const d = Math.min(codo, v.distanceTo(antes) / 2, v.distanceTo(despues) / 2)
    return { v, entrada: v.clone().addScaledVector(antes.clone().sub(v).normalize(), d), salida: v.clone().addScaledVector(despues.clone().sub(v).normalize(), d), d }
  }
  const conCodo = (i: number) => (cerrado || (i > 0 && i < n - 1)) && codo > 0
  const tramos: Curve<Vector3>[] = []
  const recto = (a: Vector3, b: Vector3) => {
    if (a.distanceTo(b) > 1e-9) tramos.push(new LineCurve3(a, b))
  }
  const ultimo = cerrado ? n : n - 1
  let desde = conCodo(0) ? esquina(0).salida : p[0]!
  for (let i = 1; i <= ultimo; i++) {
    const k = i % n
    if (conCodo(k)) {
      const e = esquina(k)
      recto(desde, e.entrada)
      if (e.d > 0) tramos.push(new QuadraticBezierCurve3(e.entrada, e.v, e.salida))
      desde = e.salida
    } else {
      recto(desde, p[k]!)
      desde = p[k]!
    }
  }
  return tramos
}

/**
 * Tubo de `radio` por los `puntos` ([x, y, z] del plano del elemento, en metros), con los codos redondeados a `codo`. Un tubo por
 * tramo (recto en un segmento, codo en `TRAMOS_CODO`), unidos: así cada codo lleva sus segmentos y los rectos no gastan ninguno.
 * Textura en metros: a lo largo, lo recorrido; alrededor, 2π·radio.
 */
export function geometriaTubo(puntos: Vec3[], radio: number, codo: number, cerrado: boolean): BufferGeometry {
  const tramos = tramosConCodos(puntos.map(([x, y, z]) => new Vector3(x, z, y)), codo, cerrado)
  let recorrido = 0
  const partes = tramos.map((t) => {
    const g = new TubeGeometry(t, t instanceof LineCurve3 ? 1 : TRAMOS_CODO, radio, LADOS_TUBO, false)
    const largo = t.getLength()
    const uv = g.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, recorrido + uv.getX(i) * largo, uv.getY(i) * 2 * Math.PI * radio)
    recorrido += largo
    return g
  })
  const g = mergeGeometries(partes)
  partes.forEach((p) => p.dispose())
  return g
}
