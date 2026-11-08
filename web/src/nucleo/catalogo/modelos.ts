import type { Elemento } from '../modelo/documento'
import type { PiezaLocal } from '../modelo3d/tipos'

/** Caja local; con `radio` (cm) sus aristas salen redondeadas en 3D. Sin radio no se añade la clave: las piezas de siempre quedan iguales. */
export function caja(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, zona: string, radio?: number): PiezaLocal {
  return { forma: 'caja', x0, y0, z0, x1, y1, z1, zona, ...(radio === undefined ? {} : { radio }) }
}

export function cilindro(cx: number, cy: number, r: number, z0: number, z1: number, zona: string): PiezaLocal {
  return { forma: 'cilindro', cx, cy, r, z0, z1, zona }
}

/** Cuatro patas cuadradas de `lado`, metidas `margen` desde cada esquina. */
export function patas4(e: Elemento, lado: number, alto: number, zona: string, margen = 3): PiezaLocal[] {
  const { ancho, fondo } = e.medidas
  const xs = [-ancho / 2 + margen, ancho / 2 - margen - lado]
  const ys = [-fondo / 2 + margen, fondo / 2 - margen - lado]
  return xs.flatMap((x) => ys.map((y) => caja(x, y, 0, x + lado, y + lado, alto, zona)))
}

/** Los frentes quedan retranqueados 1,5 cm para que el tirador termine en el borde del volumen. */
const FRENTE_Y0 = 3.5
const FRENTE_Y1 = 1.5
const TIRADOR = { ancho: 12, fondo: 1.5, alto: 1.5 }

/** `n` frentes iguales a lo ancho, de 2 cm de fondo, con `separacion` entre ellos. */
export function frentes(e: Elemento, n: number, zDesde: number, zHasta: number, zona: string, separacion = 0.4): PiezaLocal[] {
  const { ancho, fondo } = e.medidas
  const w = (ancho - (n - 1) * separacion) / n
  return Array.from({ length: n }, (_, i) => {
    const x0 = -ancho / 2 + i * (w + separacion)
    return caja(x0, fondo / 2 - FRENTE_Y0, zDesde, x0 + w, fondo / 2 - FRENTE_Y1, zHasta, zona)
  })
}

/** Ancho del tirador en un frente de ancho `w`: 12 cm como mucho y 1 cm de margen a cada lado; 0 si no cabe. */
function anchoTirador(w: number): number {
  const a = Math.min(TIRADOR.ancho, w - 2)
  return a > 1 ? a : 0
}

/** Un tirador de 12×1,5×1,5 cm (más estrecho si el frente lo es) centrado en cada uno de los `n` frentes, con su base en `z`. */
export function tiradores(e: Elemento, n: number, z: number, zona: string, separacion = 0.4): PiezaLocal[] {
  const { ancho, fondo } = e.medidas
  const w = (ancho - (n - 1) * separacion) / n
  const a = anchoTirador(w)
  if (a === 0) return []
  return Array.from({ length: n }, (_, i) => {
    const c = -ancho / 2 + i * (w + separacion) + w / 2
    return caja(c - a / 2, fondo / 2 - TIRADOR.fondo, z, c + a / 2, fondo / 2, z + TIRADOR.alto, zona)
  })
}

/** `n` frentes apilados en vertical a todo el ancho, cada uno con su tirador centrado. */
export function cajonesApilados(e: Elemento, n: number, zDesde: number, zHasta: number, zona: string, separacion = 0.4): PiezaLocal[] {
  const { ancho, fondo } = e.medidas
  const h = (zHasta - zDesde - (n - 1) * separacion) / n
  return Array.from({ length: n }, (_, i) => {
    const z0 = zDesde + i * (h + separacion)
    const zc = z0 + h / 2 - TIRADOR.alto / 2
    const a = anchoTirador(ancho)
    return [
      caja(-ancho / 2, fondo / 2 - FRENTE_Y0, z0, ancho / 2, fondo / 2 - FRENTE_Y1, z0 + h, zona),
      ...(a === 0 ? [] : [caja(-a / 2, fondo / 2 - TIRADOR.fondo, zc, a / 2, fondo / 2, zc + TIRADOR.alto, zona)]),
    ]
  }).flat()
}

/** Las mismas piezas desplazadas `dy` cm a lo fondo (negativo = hacia atrás). */
export function desplazadasY(piezas: PiezaLocal[], dy: number): PiezaLocal[] {
  return piezas.map((p) => (p.forma === 'caja' ? { ...p, y0: p.y0 + dy, y1: p.y1 + dy } : { ...p, cy: p.cy + dy }))
}

/** Cuerpo hueco por detrás de los frentes: llega a `fondo/2 − 3,5` si hay frentes y a `fondo/2` si no. */
export function yFrenteCuerpo(e: Elemento, conFrentes: boolean): number {
  return e.medidas.fondo / 2 - (conFrentes ? FRENTE_Y0 : 0)
}

/** Mueble bajo con zócalo de 8 cm, cuerpo y `puertas` frentes con tirador (sin puertas, el cuerpo llega al frente). */
export function cuerpoConZocalo(e: Elemento, puertas: number, zona: string): PiezaLocal[] {
  const { ancho, fondo, alto } = e.medidas
  return [
    caja(-ancho / 2 + 3, -fondo / 2 + 3, 0, ancho / 2 - 3, yFrenteCuerpo(e, true), 8, zona),
    caja(-ancho / 2, -fondo / 2, 8, ancho / 2, yFrenteCuerpo(e, puertas > 0), alto, zona),
    ...frentes(e, puertas, 9, alto - 1, zona),
    ...tiradores(e, puertas, (alto + 8) / 2 - 0.75, zona),
  ]
}

/** Óvalo inscrito en ancho×fondo entre z0 y z1: una caja central y un cilindro en cada extremo del lado mayor. */
export function ovalo(e: Elemento, z0: number, z1: number, zona: string): PiezaLocal[] {
  const { ancho, fondo } = e.medidas
  const r = Math.min(ancho, fondo) / 2
  const tramo = Math.abs(ancho - fondo) / 2
  const centros = ancho >= fondo ? [[-tramo, 0], [tramo, 0]] : [[0, -tramo], [0, tramo]]
  const piezas = centros.map(([cx, cy]) => cilindro(cx!, cy!, r, z0, z1, zona))
  if (tramo < 0.5) return [piezas[0]!]
  return [ancho >= fondo ? caja(-tramo, -r, z0, tramo, r, z1, zona) : caja(-r, -tramo, z0, r, tramo, z1, zona), ...piezas]
}

/** Tablero de 3 cm sobre cuatro patas de 5 cm. */
export function mesaConPatas(e: Elemento, zonaTablero: string, zonaPatas: string): PiezaLocal[] {
  const { ancho, fondo, alto } = e.medidas
  return [caja(-ancho / 2, -fondo / 2, alto - 3, ancho / 2, fondo / 2, alto, zonaTablero), ...patas4(e, 5, alto - 3, zonaPatas)]
}

export type LadoChaise = 'no' | 'izquierda' | 'derecha'

/** Sofá o sillón (plazas = 1): base, respaldo de 20 cm, brazos de 15 cm, cojines y patas; la chaise ocupa el lado indicado. */
export function asientoTapizado(e: Elemento, plazas: number, chaise: LadoChaise, zonaPatas = 'patas'): PiezaLocal[] {
  const { ancho, fondo, alto } = e.medidas
  const pata = 8
  const asiento = alto - 40
  const zBase = asiento - 12
  const xA = chaise === 'izquierda' ? -ancho / 2 : -ancho / 2 + 15
  const xB = chaise === 'derecha' ? ancho / 2 : ancho / 2 - 15
  const w = (xB - xA - (plazas - 1) * 0.4) / plazas
  const piezas: PiezaLocal[] = [
    caja(-ancho / 2, -fondo / 2, pata, ancho / 2, fondo / 2, zBase, 'tapizado'),
    caja(xA, -fondo / 2, zBase, xB, -fondo / 2 + 20, alto, 'tapizado'),
    ...Array.from({ length: plazas }, (_, i) => {
      const x0 = xA + i * (w + 0.4)
      return caja(x0, -fondo / 2 + 20, zBase, x0 + w, fondo / 2, asiento, 'tapizado')
    }),
    ...patas4(e, 5, pata, zonaPatas),
  ]
  if (chaise !== 'derecha') piezas.push(caja(-ancho / 2, -fondo / 2, pata, -ancho / 2 + 15, fondo / 2, alto - 20, 'tapizado'))
  if (chaise !== 'izquierda') piezas.push(caja(ancho / 2 - 15, -fondo / 2, pata, ancho / 2, fondo / 2, alto - 20, 'tapizado'))
  if (chaise !== 'no') {
    const ancha = Math.min(90, ancho / 2)
    const [x0, x1] = chaise === 'izquierda' ? [-ancho / 2, -ancho / 2 + ancha] : [ancho / 2 - ancha, ancho / 2]
    const y1 = fondo / 2 + 70
    piezas.push(
      caja(x0, fondo / 2, pata, x1, y1, zBase, 'tapizado'),
      caja(x0, fondo / 2, zBase, x1, y1, asiento, 'tapizado'),
      ...[x0 + 3, x1 - 8].map((x) => caja(x, y1 - 8, 0, x + 5, y1 - 3, pata, zonaPatas)),
    )
  }
  return piezas
}

/** El mismo color con cada canal multiplicado por `k`; lo que no sea #rrggbb queda igual. */
export function oscurecer(hex: string, k: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex
  return `#${[1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('')}`
}

/** Taza de inodoro o bidé entre z0 y z1: recta por detrás desde `yAtras` y redondeada por delante, con el radio de medio ancho. */
export function taza(e: Elemento, yAtras: number, z0: number, z1: number, zona: string): PiezaLocal[] {
  const { ancho, fondo } = e.medidas
  const r = ancho / 2
  const yCentro = fondo / 2 - r
  return [caja(-r, yAtras, z0, r, yCentro, z1, zona), cilindro(0, yCentro, r, z0, z1, zona)]
}

/** Cristal de mampara de 1 cm en el borde del frente, de x0 a x1 y de z0 a z1, con su perfil arriba. */
export function mampara(e: Elemento, x0: number, x1: number, z0: number, z1: number, zonaPerfil: string): PiezaLocal[] {
  const y1 = e.medidas.fondo / 2
  return [
    { ...caja(x0, y1 - 1, z0, x1, y1, z1 - 2, zonaPerfil), material: 'mampara', color: '#dcebef' },
    caja(x0, y1 - 1, z1 - 2, x1, y1, z1, zonaPerfil),
  ]
}
