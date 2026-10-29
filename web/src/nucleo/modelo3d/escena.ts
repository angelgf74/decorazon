import type { Elemento, Punto } from '../modelo/documento'
import type { DefinicionTipo } from '../catalogo/tipos'
import { aMundo } from '../catalogo/transformar'
import type { Pieza3D, PiezaLocal, Vec3 } from './tipos'

/** Del plano (cm, y hacia abajo) a la escena (m, y arriba): el y del plano pasa a ser el z. */
export function aEscena(p: Punto, zCm: number): Vec3 {
  return [p.x / 100, zCm / 100, p.y / 100]
}

/** Reserva para un tipo sin `modelo3d`: una caja del tamaño del elemento con la primera zona. */
export function modeloPorVolumenes(e: Elemento, zona = ''): PiezaLocal[] {
  const { ancho, fondo, alto } = e.medidas
  return [{ forma: 'caja', x0: -ancho / 2, y0: -fondo / 2, z0: 0, x1: ancho / 2, y1: fondo / 2, z1: alto, zona }]
}

export function piezasDeElemento(e: Elemento, def: DefinicionTipo): Pieza3D[] {
  const locales = def.modelo3d ? def.modelo3d(e) : modeloPorVolumenes(e, def.zonasColor[0]?.clave)
  const giroY = 0 - (e.rotacion * Math.PI) / 180
  return locales.map((p): Pieza3D => {
    const zona = def.zonasColor.find((z) => z.clave === p.zona)
    const material = zona?.material ?? 'lacado'
    const color = e.colores[p.zona] ?? zona?.defecto ?? '#cccccc'
    if (p.forma === 'caja') {
      const c = aMundo(e, { x: (p.x0 + p.x1) / 2, y: (p.y0 + p.y1) / 2 })
      return {
        forma: 'caja', material, color, giroY,
        centro: aEscena(c, e.alturaSuelo + (p.z0 + p.z1) / 2),
        tamano: [(p.x1 - p.x0) / 100, (p.z1 - p.z0) / 100, (p.y1 - p.y0) / 100],
      }
    }
    const c = aMundo(e, { x: p.cx, y: p.cy })
    return {
      forma: 'cilindro', material, color,
      centro: aEscena(c, e.alturaSuelo + (p.z0 + p.z1) / 2),
      radio: p.r / 100, alto: (p.z1 - p.z0) / 100,
    }
  })
}
