import { Box3, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three'
import { describe, expect, it } from 'vitest'
import { aEscena, catalogoBase, piezasDeElemento, type DefinicionTipo, type PiezaLocal, type Vec3 } from '../../nucleo'
import { cajaDePieza, type CajaLocal } from '../../nucleo/modelo3d/formas'
import { aMundo } from '../../nucleo/catalogo/transformar'
import { elementoNuevo } from '../../nucleo/catalogo/elemento'
import { geometriaExtrusion, geometriaRevolucion, geometriaTubo } from './geometrias'

/** Caja de la geometría [x0, y0, z0, x1, y1, z1] (ejes de la escena). */
function caja(g: BufferGeometry): number[] {
  const b = new Box3().setFromBufferAttribute(g.getAttribute('position') as never)
  return [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z]
}

/** La caja local de una pieza (cm, ejes del plano) en metros y con los ejes de la escena: x, z arriba, y a lo fondo. */
function enEscena(c: CajaLocal): number[] {
  return [c.x0, c.z0, c.y0, c.x1, c.z1, c.y1].map((v) => v / 100)
}

/** Recorre los triángulos (con o sin índice) como tres índices de vértice. */
function triangulos(g: BufferGeometry): [number, number, number][] {
  const n = g.index ? g.index.count : g.getAttribute('position').count
  const idx = (k: number) => (g.index ? g.index.getX(k) : k)
  return Array.from({ length: n / 3 }, (_, t): [number, number, number] => [idx(3 * t), idx(3 * t + 1), idx(3 * t + 2)])
}

const vertice = (g: BufferGeometry, i: number) => new Vector3().fromBufferAttribute(g.getAttribute('position') as never, i)
const normal = (g: BufferGeometry, i: number) => new Vector3().fromBufferAttribute(g.getAttribute('normal') as never, i)

/** Volumen con signo (teorema de la divergencia): positivo si los triángulos miran hacia fuera. */
function volumen(g: BufferGeometry): number {
  return triangulos(g).reduce((s, [a, b, c]) => s + vertice(g, a).dot(vertice(g, b).cross(vertice(g, c))) / 6, 0)
}

/** Triángulos cuya normal geométrica (por el orden de sus vértices, la que usa el descarte de caras) contradice la de sus vértices. */
function normalesContrarias(g: BufferGeometry): number {
  return triangulos(g).filter(([a, b, c]) => {
    const n = vertice(g, b).sub(vertice(g, a)).cross(vertice(g, c).sub(vertice(g, a)))
    if (n.lengthSq() < 1e-14) return false
    return n.dot(normal(g, a).add(normal(g, b)).add(normal(g, c))) <= 0
  }).length
}

function rangoUV(g: BufferGeometry): [number, number] {
  const uv = g.getAttribute('uv')
  const us = Array.from({ length: uv.count }, (_, i) => uv.getX(i))
  const vs = Array.from({ length: uv.count }, (_, i) => uv.getY(i))
  return [Math.max(...us) - Math.min(...us), Math.max(...vs) - Math.min(...vs)]
}

const cerca = (a: number[], b: number[], digitos = 6) => expect(a.map((v) => Number(v.toFixed(digitos)))).toEqual(b.map((v) => Number(v.toFixed(digitos))))

describe('geometriaRevolucion', () => {
  // Un cilindro de 20 cm de radio y 50 de alto como revolución: abajo, fuera, arriba (antihorario con el radio a la derecha).
  const perfil: [number, number][] = [[0, 0], [20, 0], [20, 50], [0, 50]]
  const local: PiezaLocal = { forma: 'revolucion', cx: 10, cy: -20, perfil, zona: 'z' }
  const g = geometriaRevolucion([0.1, -0.2], perfil.map(([r, z]) => [r / 100, z / 100]), 24, 1)

  it('ocupa la caja que dice el núcleo (cajaDePieza), con el centro en (cx, cy) y z hacia arriba', () => {
    cerca(caja(g), enEscena(cajaDePieza(local)))
  })

  it('está cerrada y mira hacia fuera: volumen positivo, el del prisma de 24 lados', () => {
    const area = 12 * 0.2 * 0.2 * Math.sin(Math.PI / 12)
    expect(volumen(g)).toBeCloseTo(area * 0.5, 6)
    expect(normalesContrarias(g)).toBe(0)
  })

  it('los cantos del perfil quedan vivos: cada normal es vertical (tapas) u horizontal (lateral), ninguna a medias', () => {
    const pos = g.getAttribute('position')
    const tipos = new Set<string>()
    for (let i = 0; i < pos.count; i++) {
      const n = normal(g, i)
      if (n.lengthSq() < 0.5) continue // triángulos degenerados en el eje
      const ny = Math.abs(n.y)
      expect(ny < 1e-6 || ny > 1 - 1e-6, `normal ${n.toArray()}`).toBe(true)
      tipos.add(ny > 0.5 ? 'tapa' : 'lateral')
    }
    expect([...tipos].sort()).toEqual(['lateral', 'tapa'])
  })

  it('las coordenadas de textura van en metros: la vuelta mide 2πr y el perfil lo que mide su recorrido', () => {
    const [u, v] = rangoUV(g)
    expect(u).toBeCloseTo(2 * Math.PI * 0.2)
    expect(v).toBeCloseTo(0.2 + 0.5 + 0.2)
  })

  it('con 4 lados es una pirámide con las caras en los ejes; `escalaY` estira a lo fondo (z de la escena)', () => {
    const r = 0.2 * Math.SQRT2
    const p = geometriaRevolucion([0, 0], [[0, 0], [r, 0], [r, 0.3], [0, 0.3]], 4, 0.5)
    cerca(caja(p), [-0.2, 0, -0.1, 0.2, 0.3, 0.1])
    expect(volumen(p)).toBeCloseTo(0.4 * 0.2 * 0.3, 6)
    expect(normalesContrarias(p)).toBe(0)
  })
})

describe('geometriaExtrusion', () => {
  // Contorno asimétrico para ver a qué eje va cada coordenada; 30 × 5 cm, extruido de 30 a 40.
  const contorno: [number, number][] = [[-0.1, 0], [0.2, 0], [0.2, 0.05], [-0.1, 0.05]]

  it('en planta: (x, y) del plano son x y z de la escena, y sube de `desde` a `hasta`', () => {
    const g = geometriaExtrusion('planta', contorno, [], 0.3, 0.4)
    cerca(caja(g), [-0.1, 0.3, 0, 0.2, 0.4, 0.05])
    expect(volumen(g)).toBeCloseTo(0.3 * 0.05 * 0.1, 6)
    expect(normalesContrarias(g)).toBe(0)
  })

  it('en alzado: (x, z) son x y la altura, y va a lo fondo (z de la escena) de `desde` a `hasta`', () => {
    const g = geometriaExtrusion('alzado', contorno, [], 0.3, 0.4)
    cerca(caja(g), [-0.1, 0, 0.3, 0.2, 0.05, 0.4])
    expect(volumen(g)).toBeCloseTo(0.3 * 0.05 * 0.1, 6)
    expect(normalesContrarias(g)).toBe(0)
  })

  it('de perfil: (y, z) son la z de la escena y la altura, y va a lo ancho (x) de `desde` a `hasta`', () => {
    const g = geometriaExtrusion('perfil', contorno, [], 0.3, 0.4)
    cerca(caja(g), [0.3, 0, -0.1, 0.4, 0.05, 0.2])
    expect(volumen(g)).toBeCloseTo(0.3 * 0.05 * 0.1, 6)
    expect(normalesContrarias(g)).toBe(0)
  })

  it('los huecos atraviesan la pieza (un marco), en los tres planos', () => {
    const marco: [number, number][] = [[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1]]
    const hueco: [number, number][] = [[0.03, 0.03], [0.07, 0.03], [0.07, 0.07], [0.03, 0.07]]
    for (const plano of ['planta', 'alzado', 'perfil'] as const) {
      const g = geometriaExtrusion(plano, marco, [hueco], 0, 0.02)
      expect(volumen(g), plano).toBeCloseTo((0.01 - 0.0016) * 0.02, 7)
      expect(normalesContrarias(g), plano).toBe(0)
    }
  })

  it('las coordenadas de textura van en metros: la tapa mide lo que el contorno', () => {
    const g = geometriaExtrusion('alzado', contorno, [], 0.3, 0.4)
    const uv = g.getAttribute('uv')
    const us: number[] = []
    const vs: number[] = []
    for (let i = 0; i < uv.count; i++) {
      if (Math.abs(normal(g, i).z) > 0.999) {
        us.push(uv.getX(i))
        vs.push(uv.getY(i))
      }
    }
    expect(Math.max(...us) - Math.min(...us)).toBeCloseTo(0.3)
    expect(Math.max(...vs) - Math.min(...vs)).toBeCloseTo(0.05)
  })
})

describe('geometriaTubo', () => {
  it('un tramo recto: los puntos ([x, y, z] del plano) más el radio, con x, z arriba e y a lo fondo de la escena', () => {
    const g = geometriaTubo([[0.1, 0.05, 0], [0.1, 0.05, 0.5]], 0.02, 0, false)
    cerca(caja(g), [0.08, 0, 0.03, 0.12, 0.5, 0.07])
    expect(normalesContrarias(g)).toBe(0)
    const [u, v] = rangoUV(g)
    expect(u).toBeCloseTo(0.5)
    expect(v).toBeCloseTo(2 * Math.PI * 0.02)
  })

  it('con codo redondeado no se sale de la caja del núcleo y recorre menos que la poligonal', () => {
    const puntos: [number, number, number][] = [[0, 0, 0], [0, 0, 40], [30, 0, 40]]
    const g = geometriaTubo(puntos.map(([x, y, z]): Vec3 => [x / 100, y / 100, z / 100]), 0.02, 0.1, false)
    const [x0, y0, z0, x1, y1, z1] = enEscena(cajaDePieza({ forma: 'tubo', puntos, r: 2, codo: 10, zona: 'z' }))
    const [gx0, gy0, gz0, gx1, gy1, gz1] = caja(g)
    expect(gx0).toBeGreaterThanOrEqual(x0! - 1e-6)
    expect(gy0).toBeGreaterThanOrEqual(y0! - 1e-6)
    expect(gz0).toBeGreaterThanOrEqual(z0! - 1e-6)
    expect(gx1).toBeLessThanOrEqual(x1! + 1e-6)
    expect(gy1).toBeLessThanOrEqual(y1! + 1e-6)
    expect(gz1).toBeLessThanOrEqual(z1! + 1e-6)
    const [u] = rangoUV(g)
    expect(u).toBeGreaterThan(0.7 - 0.2 + (0.1 * Math.PI) / 2 * 0.9)
    expect(u).toBeLessThan(0.7)
    expect(normalesContrarias(g)).toBe(0)
  })

  it('cerrado, el último punto vuelve al primero: recorre el perímetro entero, con los cuatro codos', () => {
    const cuadrado: Vec3[] = [[0, 0, 0], [0.4, 0, 0], [0.4, 0.4, 0], [0, 0.4, 0]]
    const [abierto] = rangoUV(geometriaTubo(cuadrado, 0.02, 0.05, false))
    const [cerrado] = rangoUV(geometriaTubo(cuadrado, 0.02, 0.05, true))
    // Abierto: tres lados (1,2 m) menos lo que recortan dos codos. Cerrado: los cuatro lados, cada esquina cambiada por su codo.
    expect(abierto).toBeLessThan(1.2)
    expect(cerrado).toBeGreaterThan(1.6 - 8 * 0.05 + 4 * ((0.05 * Math.PI) / 2) * 0.9)
    expect(cerrado).toBeLessThan(1.6)
  })
})

describe('las formas nuevas, colocadas con su origen y su giro, caen donde el plano dice', () => {
  const mesa = catalogoBase.get('mesa') as DefinicionTipo
  const e = { ...elementoNuevo(mesa, { x: 120, y: 80 }), rotacion: 37, alturaSuelo: 30 }

  it('el centro de una revolución en (10, −20) local cae en aMundo(e, (10, −20)) a la altura del elemento', () => {
    const def: DefinicionTipo = { ...mesa, modelo3d: () => [{ forma: 'revolucion', cx: 10, cy: -20, perfil: [[0, 0], [5, 0], [5, 10], [0, 10]], zona: 'tablero' }] }
    const [p] = piezasDeElemento(e, def)
    if (p?.forma !== 'revolucion') throw new Error('forma')
    const g = geometriaRevolucion(p.centro, p.perfil, p.lados, p.escalaY)
    g.applyMatrix4(new Matrix4().compose(new Vector3(...p.origen), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), p.giroY), new Vector3(1, 1, 1)))
    const centro = new Box3().setFromBufferAttribute(g.getAttribute('position') as never).getCenter(new Vector3())
    const esperado = aEscena(aMundo(e, { x: 10, y: -20 }), 30 + 5)
    cerca([centro.x, centro.y, centro.z], esperado, 4)
  })
})
