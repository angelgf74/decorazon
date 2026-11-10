import type { Elemento } from '../modelo/documento'
import type { PiezaLocal, PlanoExtrusion } from '../modelo3d/tipos'
import type { DefinicionVariante } from './tipos'

/** Caja local; con `radio` (cm) sus aristas salen redondeadas en 3D. Sin radio no se añade la clave: las piezas de siempre quedan iguales. */
export function caja(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, zona: string, radio?: number): PiezaLocal {
  return { forma: 'caja', x0, y0, z0, x1, y1, z1, zona, ...(radio === undefined ? {} : { radio }) }
}

export function cilindro(cx: number, cy: number, r: number, z0: number, z1: number, zona: string): PiezaLocal {
  return { forma: 'cilindro', cx, cy, r, z0, z1, zona }
}

/** Revolución del `perfil` ([radio, z], antihorario: sube por fuera, baja por dentro) alrededor del eje vertical por (cx, cy). */
export function revolucion(cx: number, cy: number, perfil: [number, number][], zona: string, opciones: { lados?: number; escalaY?: number } = {}): PiezaLocal {
  return { forma: 'revolucion', cx, cy, perfil, zona, ...opciones }
}

/** Extrusión de un `contorno` (con `huecos`) en su `plano`, de `desde` a `hasta` en el eje que falta (ver `PiezaLocal`). */
export function extrusion(plano: PlanoExtrusion, contorno: [number, number][], desde: number, hasta: number, zona: string, huecos?: [number, number][][]): PiezaLocal {
  return { forma: 'extrusion', plano, contorno, desde, hasta, zona, ...(huecos ? { huecos } : {}) }
}

/** Tubo de radio `r` por los `puntos` ([x, y, z]); `codo` redondea las esquinas y `cerrado` vuelve al primero. */
export function tubo(puntos: [number, number, number][], r: number, zona: string, opciones: { codo?: number; cerrado?: boolean } = {}): PiezaLocal {
  return { forma: 'tubo', puntos, r, zona, ...opciones }
}

export type FormaPatas = 'cuadradas' | 'redondas'
/** La variante «Patas» que comparten las mesas, la silla y el taburete (plan 28c). */
// «Forma de las patas» y no «Patas»: la zona de color ya se llama así y serían dos controles con el mismo nombre.
export const VARIANTE_PATAS: DefinicionVariante = { clave: 'patas', etiqueta: 'Forma de las patas', valores: ['cuadradas', 'redondas'], defecto: 'cuadradas' }
/** La forma de patas pedida en la variante `patas` (cuadradas si el tipo no la tiene). */
export const formaPatas = (e: Elemento): FormaPatas => (e.variantes.patas === 'redondas' ? 'redondas' : 'cuadradas')

/** Cuatro patas de `lado` (cuadradas, o cilindros del mismo diámetro), metidas `margen` desde cada esquina. */
export function patas4(e: Elemento, lado: number, alto: number, zona: string, margen = 3, forma: FormaPatas = 'cuadradas'): PiezaLocal[] {
  const { ancho, fondo } = e.medidas
  const xs = [-ancho / 2 + margen, ancho / 2 - margen - lado]
  const ys = [-fondo / 2 + margen, fondo / 2 - margen - lado]
  return xs.flatMap((x) => ys.map((y) => (forma === 'redondas' ? cilindro(x + lado / 2, y + lado / 2, lado / 2, 0, alto, zona) : caja(x, y, 0, x + lado, y + lado, alto, zona))))
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

/**
 * `n` frentes apilados en vertical entre `x0` y `x1`, cada uno con su tirador centrado (en `zonaTirador`, por defecto la misma).
 * El frente del mueble está en `yFrente` (por defecto el del elemento; en un escritorio en L, el del tablero principal).
 */
export function cajonesApiladosEn(e: Elemento, x0: number, x1: number, n: number, zDesde: number, zHasta: number, zona: string, zonaTirador = zona, separacion = 0.4, yFrente = e.medidas.fondo / 2): PiezaLocal[] {
  const h = (zHasta - zDesde - (n - 1) * separacion) / n
  const cx = (x0 + x1) / 2
  const a = anchoTirador(x1 - x0)
  return Array.from({ length: n }, (_, i) => {
    const z0 = zDesde + i * (h + separacion)
    const zc = z0 + h / 2 - TIRADOR.alto / 2
    return [
      caja(x0, yFrente - FRENTE_Y0, z0, x1, yFrente - FRENTE_Y1, z0 + h, zona),
      ...(a === 0 ? [] : [caja(cx - a / 2, yFrente - TIRADOR.fondo, zc, cx + a / 2, yFrente, zc + TIRADOR.alto, zonaTirador)]),
    ]
  }).flat()
}

/** `n` frentes apilados en vertical a todo el ancho, cada uno con su tirador centrado. */
export function cajonesApilados(e: Elemento, n: number, zDesde: number, zHasta: number, zona: string, separacion = 0.4): PiezaLocal[] {
  const { ancho } = e.medidas
  return cajonesApiladosEn(e, -ancho / 2, ancho / 2, n, zDesde, zHasta, zona, zona, separacion)
}

/**
 * Cajonera bajo un tablero, entre `x0` y `x1`: cuerpo del suelo a `zHasta` con tres cajones de frente (tiradores en `zonaTirador`).
 * Va de `yTrasera` a `yFrente` (por defecto, el fondo entero del elemento).
 */
export function cajoneraLateral(e: Elemento, x0: number, x1: number, zHasta: number, zona: string, zonaTirador: string, yTrasera = -e.medidas.fondo / 2, yFrente = e.medidas.fondo / 2): PiezaLocal[] {
  return [caja(x0, yTrasera, 0, x1, yFrente - FRENTE_Y0, zHasta, zona), ...cajonesApiladosEn(e, x0, x1, 3, 1, zHasta - 1, zona, zonaTirador, 0.4, yFrente)]
}

/** Las mismas piezas desplazadas `dy` cm a lo fondo (negativo = hacia atrás). */
export function desplazadasY(piezas: PiezaLocal[], dy: number): PiezaLocal[] {
  return piezas.map((p): PiezaLocal => {
    switch (p.forma) {
      case 'caja':
        return { ...p, y0: p.y0 + dy, y1: p.y1 + dy }
      case 'cilindro':
      case 'revolucion':
        return { ...p, cy: p.cy + dy }
      case 'extrusion': {
        // En planta y de perfil, la y es una coordenada del contorno (la segunda o la primera); en alzado, el tramo extruido.
        if (p.plano === 'alzado') return { ...p, desde: p.desde + dy, hasta: p.hasta + dy }
        const mover = p.plano === 'planta' ? ([a, b]: [number, number]): [number, number] => [a, b + dy] : ([a, b]: [number, number]): [number, number] => [a + dy, b]
        return { ...p, contorno: p.contorno.map(mover), ...(p.huecos ? { huecos: p.huecos.map((h) => h.map(mover)) } : {}) }
      }
      case 'tubo':
        return { ...p, puntos: p.puntos.map(([x, y, z]): [number, number, number] => [x, y + dy, z]) }
    }
  })
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

/** Tablero de 3 cm con el canto redondeado sobre cuatro patas de 5 cm, de la forma que pida la variante `patas`. */
export function mesaConPatas(e: Elemento, zonaTablero: string, zonaPatas: string): PiezaLocal[] {
  const { ancho, fondo, alto } = e.medidas
  return [caja(-ancho / 2, -fondo / 2, alto - 3, ancho / 2, fondo / 2, alto, zonaTablero, 1), ...patas4(e, 5, alto - 3, zonaPatas, 3, formaPatas(e))]
}

export type LadoChaise = 'no' | 'izquierda' | 'derecha'

/** Reparte el tramo `desde..hasta` en cojines contiguos de `anchoMax` como mucho, con `hueco` entre ellos: [[x0, x1], …]. */
export function cojinesEnTramo(desde: number, hasta: number, anchoMax = 70, hueco = 0.4): [number, number][] {
  const n = Math.max(1, Math.ceil((hasta - desde) / anchoMax))
  const w = (hasta - desde - (n - 1) * hueco) / n
  return Array.from({ length: n }, (_, i): [number, number] => [desde + i * (w + hueco), desde + i * (w + hueco) + w])
}

/** Radios de redondeo del tapizado, en cm: estructura (base, armazón del respaldo), brazos y cojines. */
export const RADIO_ESTRUCTURA = 2
export const RADIO_BRAZO = 4
export const RADIO_COJIN = 5

/**
 * Sofá o sillón (plazas = 1): base, armazón del respaldo de 8 cm con un cojín de respaldo por plaza (hasta 20 cm del fondo),
 * brazos de 15 cm, cojines de asiento de 12 cm y patas; la chaise ocupa el lado indicado. Todo el tapizado va redondeado;
 * las piezas quedan dentro de la caja del elemento (los conflictos usan los `volumenes`, no estas piezas).
 */
export function asientoTapizado(e: Elemento, plazas: number, chaise: LadoChaise, zonaPatas = 'patas'): PiezaLocal[] {
  const { ancho, fondo, alto } = e.medidas
  const pata = 8
  const asiento = alto - 40
  const zBase = asiento - 12
  const yArmazon = -fondo / 2 + 8
  const yRespaldo = -fondo / 2 + 20
  const xA = chaise === 'izquierda' ? -ancho / 2 : -ancho / 2 + 15
  const xB = chaise === 'derecha' ? ancho / 2 : ancho / 2 - 15
  const w = (xB - xA - (plazas - 1) * 0.4) / plazas
  const piezas: PiezaLocal[] = [
    caja(-ancho / 2, -fondo / 2, pata, ancho / 2, fondo / 2, zBase, 'tapizado', RADIO_ESTRUCTURA),
    caja(xA, -fondo / 2, zBase, xB, yArmazon, alto, 'tapizado', RADIO_ESTRUCTURA),
    ...Array.from({ length: plazas }, (_, i) => {
      const x0 = xA + i * (w + 0.4)
      return [
        // El cojín de respaldo deja 1 cm de aire a cada lado y 4 por arriba: se lee como cojín, no como bloque.
        caja(x0 + 1, yArmazon, zBase, x0 + w - 1, yRespaldo, alto - 4, 'tapizado', RADIO_COJIN),
        caja(x0, yRespaldo, zBase, x0 + w, fondo / 2, asiento, 'tapizado', RADIO_COJIN),
      ]
    }).flat(),
    ...patas4(e, 5, pata, zonaPatas),
  ]
  if (chaise !== 'derecha') piezas.push(caja(-ancho / 2, -fondo / 2, pata, -ancho / 2 + 15, fondo / 2, alto - 20, 'tapizado', RADIO_BRAZO))
  if (chaise !== 'izquierda') piezas.push(caja(ancho / 2 - 15, -fondo / 2, pata, ancho / 2, fondo / 2, alto - 20, 'tapizado', RADIO_BRAZO))
  if (chaise !== 'no') {
    const ancha = Math.min(90, ancho / 2)
    const [x0, x1] = chaise === 'izquierda' ? [-ancho / 2, -ancho / 2 + ancha] : [ancho / 2 - ancha, ancho / 2]
    const y1 = fondo / 2 + 70
    piezas.push(
      caja(x0, fondo / 2, pata, x1, y1, zBase, 'tapizado', RADIO_ESTRUCTURA),
      caja(x0, fondo / 2, zBase, x1, y1, asiento, 'tapizado', RADIO_COJIN),
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

/** El óvalo de la taza de un inodoro o bidé, de `yAtras` al frente y a todo el ancho: su centro en y, su radio en x y lo que se alarga. */
export function ovaloDeTaza(e: Elemento, yAtras: number): { cy: number; rx: number; escalaY: number } {
  const { ancho, fondo } = e.medidas
  return { cy: (yAtras + fondo / 2) / 2, rx: ancho / 2, escalaY: (fondo / 2 - yAtras) / ancho }
}

/**
 * Taza de loza de inodoro o bidé (revolución ovalada, `ovaloDeTaza`) del suelo al `borde`: el pie se estrecha, se ensancha hasta
 * el borde y por dentro baja la cubeta hasta media altura, donde queda una lámina de agua más oscura. Un cuerpo trasero la une
 * con la pared (o con la cisterna).
 */
export function tazaDeLoza(e: Elemento, yAtras: number, borde: number, zona: string, colorAgua: string): PiezaLocal[] {
  const { fondo } = e.medidas
  const { cy, rx, escalaY } = ovaloDeTaza(e, yAtras)
  const b = borde
  const agua = b * 0.5 + 0.1
  return [
    revolucion(0, cy, [[0, 0], [rx * 0.55, 0], [rx * 0.6, b * 0.45], [rx * 0.9, b * 0.8], [rx, b - 1.5], [rx, b], [rx - 4, b], [rx * 0.55, b * 0.62], [rx * 0.3, b * 0.5], [0, b * 0.5]], zona, { escalaY }),
    { ...revolucion(0, cy, [[0, agua], [rx * 0.3, agua], [rx * 0.3, agua + 0.3], [0, agua + 0.3]], zona, { escalaY }), color: colorAgua },
    // Hasta 0,45 del borde, por debajo del fondo de la cubeta (que baja a la mitad): más alto, asomaría dentro.
    caja(-rx * 0.5, -fondo / 2, 0, rx * 0.5, cy, b * 0.45, zona, 2),
  ]
}

/** Cristal de mampara de 1 cm en el borde del frente, de x0 a x1 y de z0 a z1, con su perfil arriba. */
export function mampara(e: Elemento, x0: number, x1: number, z0: number, z1: number, zonaPerfil: string): PiezaLocal[] {
  const y1 = e.medidas.fondo / 2
  return [
    { ...caja(x0, y1 - 1, z0, x1, y1, z1 - 2, zonaPerfil), material: 'mampara', color: '#dcebef' },
    caja(x0, y1 - 1, z1 - 2, x1, y1, z1, zonaPerfil),
  ]
}
