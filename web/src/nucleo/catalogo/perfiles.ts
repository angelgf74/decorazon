/**
 * Contornos (para `extrusion`) y perfiles (para `revolucion`) de los generadores 3D, en cm. Funciones puras: lo que devuelven es
 * lo que se pinta, y `cajaDePieza` lo mide igual.
 */

type Par = [number, number]

/** Quita los puntos seguidos repetidos (un tramo recto de largo cero entre dos esquinas). */
function sinRepetidos(ps: Par[]): Par[] {
  return ps.filter(([x, y], i) => {
    const [px, py] = ps[(i - 1 + ps.length) % ps.length]!
    return i === 0 || Math.hypot(x - px, y - py) > 1e-9
  })
}

/** Elipse de centro (cx, cy) y semiejes rx, ry, en `n` puntos (con n múltiplo de 4, los extremos de los ejes son puntos). */
export function elipse(cx: number, cy: number, rx: number, ry: number, n = 24): Par[] {
  return Array.from({ length: n }, (_, k): Par => [cx + rx * Math.cos((2 * Math.PI * k) / n), cy + ry * Math.sin((2 * Math.PI * k) / n)])
}

/** Rectángulo con las esquinas en arco de radio `r` (como mucho medio lado menor), `n` tramos por esquina. */
export function rectanguloRedondeado(x0: number, y0: number, x1: number, y1: number, r: number, n = 4): Par[] {
  const radio = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2)
  const esquinas: [number, number, number][] = [[x1 - radio, y0 + radio, -90], [x1 - radio, y1 - radio, 0], [x0 + radio, y1 - radio, 90], [x0 + radio, y0 + radio, 180]]
  return sinRepetidos(esquinas.flatMap(([cx, cy, desde]) => Array.from({ length: n + 1 }, (_, k): Par => {
    const a = ((desde + (90 * k) / n) * Math.PI) / 180
    return [cx + radio * Math.cos(a), cy + radio * Math.sin(a)]
  })))
}

/** Perfil de un elipsoide de radio `r` entre z0 y z1: del eje abajo al eje arriba (antihorario), `n` tramos. */
export function elipsoide(r: number, z0: number, z1: number, n = 8): Par[] {
  const centro = (z0 + z1) / 2
  const semieje = (z1 - z0) / 2
  return Array.from({ length: n + 1 }, (_, i): Par => {
    const a = (Math.PI * i) / n
    return [i === n ? 0 : r * Math.sin(a), centro - semieje * Math.cos(a)]
  })
}

/**
 * Tela plegada vista desde arriba: de x0 a x1 ondula alrededor de `y` con `amplitud` y `pliegues` ondas completas, con `grosor`
 * (medido en y). Ida por una cara y vuelta por la otra: un contorno cerrado.
 */
export function onda(x0: number, x1: number, y: number, amplitud: number, pliegues: number, grosor: number, porPliegue = 8): Par[] {
  const n = pliegues * porPliegue
  const centro = Array.from({ length: n + 1 }, (_, i): Par => [x0 + ((x1 - x0) * i) / n, y + amplitud * Math.sin((2 * Math.PI * pliegues * i) / n)])
  return [...centro.map(([x, yc]): Par => [x, yc + grosor / 2]), ...centro.reverse().map(([x, yc]): Par => [x, yc - grosor / 2])]
}
