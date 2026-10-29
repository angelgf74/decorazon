import type { Elemento } from '../modelo/documento'
import type { PiezaLocal } from '../modelo3d/tipos'

export function caja(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, zona: string): PiezaLocal {
  return { forma: 'caja', x0, y0, z0, x1, y1, z1, zona }
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

/** Un tirador de 12×1,5×1,5 cm centrado en cada uno de los `n` frentes, con su base en `z`. */
export function tiradores(e: Elemento, n: number, z: number, zona: string, separacion = 0.4): PiezaLocal[] {
  const { ancho, fondo } = e.medidas
  const w = (ancho - (n - 1) * separacion) / n
  return Array.from({ length: n }, (_, i) => {
    const c = -ancho / 2 + i * (w + separacion) + w / 2
    return caja(c - TIRADOR.ancho / 2, fondo / 2 - TIRADOR.fondo, z, c + TIRADOR.ancho / 2, fondo / 2, z + TIRADOR.alto, zona)
  })
}

/** `n` frentes apilados en vertical a todo el ancho, cada uno con su tirador centrado. */
export function cajonesApilados(e: Elemento, n: number, zDesde: number, zHasta: number, zona: string, separacion = 0.4): PiezaLocal[] {
  const { ancho, fondo } = e.medidas
  const h = (zHasta - zDesde - (n - 1) * separacion) / n
  return Array.from({ length: n }, (_, i) => {
    const z0 = zDesde + i * (h + separacion)
    const zc = z0 + h / 2 - TIRADOR.alto / 2
    return [
      caja(-ancho / 2, fondo / 2 - FRENTE_Y0, z0, ancho / 2, fondo / 2 - FRENTE_Y1, z0 + h, zona),
      caja(-TIRADOR.ancho / 2, fondo / 2 - TIRADOR.fondo, zc, TIRADOR.ancho / 2, fondo / 2, zc + TIRADOR.alto, zona),
    ]
  }).flat()
}

/** Cuerpo hueco por detrás de los frentes: llega a `fondo/2 − 3,5` si hay frentes y a `fondo/2` si no. */
export function yFrenteCuerpo(e: Elemento, conFrentes: boolean): number {
  return e.medidas.fondo / 2 - (conFrentes ? FRENTE_Y0 : 0)
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
