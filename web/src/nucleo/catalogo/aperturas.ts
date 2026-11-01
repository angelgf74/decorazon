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
