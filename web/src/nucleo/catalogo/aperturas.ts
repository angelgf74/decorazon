import type { Elemento } from '../modelo/documento'
import type { Prisma } from '../geometria/prisma'
import type { Punto } from '../geometria/vector'
import { sectorCircunscrito } from '../geometria/formas'
import type { ZonaApertura } from './tipos'
import { aMundo, cajaMundo } from './transformar'

/** La caja ancho×fondo×alto. */
export function cajaEntera(e: Elemento): Prisma[] {
  const { ancho, fondo, alto } = e.medidas
  return [cajaMundo(e, -ancho / 2, -fondo / 2, ancho / 2, fondo / 2, 0, alto)]
}

/** La huella ancho×fondo entera, para el plano de las piezas que chocan por partes. */
export function huellaEntera(e: Elemento): Punto[][] {
  return [cajaEntera(e)[0]!.huella]
}

/** Tablero de 3 cm y cuatro patas de 5 cm metidas 3 cm, como `mesaConPatas`: lo que quepa debajo no choca. */
export function tableroConPatas(e: Elemento): Prisma[] {
  const { ancho, fondo, alto } = e.medidas
  const xs = [-ancho / 2 + 3, ancho / 2 - 8]
  const ys = [-fondo / 2 + 3, fondo / 2 - 8]
  return [
    cajaMundo(e, -ancho / 2, -fondo / 2, ancho / 2, fondo / 2, alto - 3, alto),
    ...xs.flatMap((x) => ys.map((y) => cajaMundo(e, x, y, x + 5, y + 5, 0, alto - 3))),
  ]
}

/** Asiento a lo ancho y fondo hasta `asiento` cm y respaldo de `grueso` cm detrás (y local negativa) hasta arriba. */
export function asientoYRespaldo(e: Elemento, asiento: number, grueso: number): Prisma[] {
  const { ancho, fondo, alto } = e.medidas
  return [
    cajaMundo(e, -ancho / 2, -fondo / 2, ancho / 2, fondo / 2, 0, asiento),
    cajaMundo(e, -ancho / 2, -fondo / 2, ancho / 2, -fondo / 2 + grueso, asiento, alto),
  ]
}

/** Óvalo inscrito en ancho×fondo (círculo si son iguales): dos semicírculos unidos por rectas a lo largo del lado mayor. */
export function huellaOvalada(e: Elemento, segmentos = 12): Punto[] {
  const { ancho, fondo } = e.medidas
  const r = Math.min(ancho, fondo) / 2
  const tramo = Math.abs(ancho - fondo) / 2
  const aLoAncho = ancho >= fondo
  const puntos: Punto[] = []
  // En un círculo los dos semicírculos comparten extremos: sin el primero de cada uno no se repiten.
  const primero = tramo > 0 ? 0 : 1
  for (const lado of [1, -1]) {
    const c = aLoAncho ? { x: lado * tramo, y: 0 } : { x: 0, y: lado * tramo }
    const desde = aLoAncho ? (lado === 1 ? -90 : 90) : (lado === 1 ? 0 : 180)
    for (let k = primero; k <= segmentos; k++) {
      const a = ((desde + (180 * k) / segmentos) * Math.PI) / 180
      puntos.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) })
    }
  }
  return puntos.map((p) => aMundo(e, p))
}

/** `hojas` iguales a lo ancho del frente: las pares con la bisagra a la izquierda, las impares a la derecha. */
export function puertasAbatibles(e: Elemento, hojas: number, zDesde = 0, zHasta = e.medidas.alto): ZonaApertura[] {
  const { ancho, fondo } = e.medidas
  const w = ancho / hojas
  const zonas: ZonaApertura[] = []
  for (let k = 0; k < hojas; k++) {
    const izq = -ancho / 2 + k * w
    const par = k % 2 === 0
    const bisagra = { x: par ? izq : izq + w, y: fondo / 2 }
    const sector = par ? sectorCircunscrito(bisagra, w, 0, 90) : sectorCircunscrito(bisagra, w, 90, 180)
    zonas.push({
      nombre: 'la puerta',
      huella: sector.map((p) => aMundo(e, p)),
      zMin: e.alturaSuelo + zDesde,
      zMax: e.alturaSuelo + zHasta,
    })
  }
  return zonas
}

/** Una caja delante del frente, de `fondo/2` a `fondo/2 + recorrido`. */
export function cajones(e: Elemento, recorrido: number, zDesde = 0, zHasta = e.medidas.alto): ZonaApertura[] {
  const { ancho, fondo } = e.medidas
  return [{ nombre: 'el cajón', ...cajaMundo(e, -ancho / 2, fondo / 2, ancho / 2, fondo / 2 + recorrido, zDesde, zHasta) }]
}

/** Barrido vertical de una puerta que abate hacia abajo, aproximado por su caja envolvente (ante la duda, conflicto). */
export function puertaAbatibleAbajo(e: Elemento, altoPuerta: number, zDesde: number): ZonaApertura[] {
  const { ancho, fondo } = e.medidas
  return [{ nombre: 'la puerta', ...cajaMundo(e, -ancho / 2, fondo / 2, ancho / 2, fondo / 2 + altoPuerta, zDesde, zDesde + altoPuerta) }]
}

/** Espacio libre delante del inodoro, el bidé y el lavabo, y delante de la entrada a la ducha y a la bañera, en cm. */
export const ESPACIO_DE_USO_CM = 70
export const ESPACIO_DE_ENTRADA_CM = 60
/** Lo que cuelga por encima (un espejo, un armario de pared) no estorba a quien está de pie delante. */
const ALTO_ESPACIO_LIBRE = 100

/** Espacio libre de `profundo` cm delante del frente, de `ancho` cm centrado, del suelo a 1 m (desde el suelo de la estancia, no desde `e.alturaSuelo`: es donde se pisa). */
export function espacioDelante(e: Elemento, nombre: string, profundo: number, ancho = e.medidas.ancho): ZonaApertura[] {
  const { fondo } = e.medidas
  const huella = [{ x: -ancho / 2, y: fondo / 2 }, { x: ancho / 2, y: fondo / 2 }, { x: ancho / 2, y: fondo / 2 + profundo }, { x: -ancho / 2, y: fondo / 2 + profundo }]
  return [{ nombre, huella: huella.map((p) => aMundo(e, p)), zMin: 0, zMax: ALTO_ESPACIO_LIBRE, espacioLibre: true }]
}
