import { ExtrudeGeometry, Shape, ShapeGeometry, type BufferGeometry } from 'three'
import type { Punto } from '../../nucleo'

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
