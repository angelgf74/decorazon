import { ExtrudeGeometry, Shape, ShapeGeometry, type BufferGeometry } from 'three'
import type { Punto, Vec3 } from '../../nucleo'

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
