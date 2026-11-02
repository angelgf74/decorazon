import { MeshPhysicalMaterial, MeshStandardMaterial, type Material } from 'three'
import { PBR, type MaterialPBR } from '../../nucleo'

export type EstadoPieza = 'normal' | 'seleccionado' | 'conflicto'

/** Terracota de la selección: resalte y contorno. */
export const COLOR_SELECCION = '#B9473A'

const RESALTE: Record<Exclude<EstadoPieza, 'normal'>, { color: string; intensidad: number }> = {
  seleccionado: { color: COLOR_SELECCION, intensidad: 0.35 },
  conflicto: { color: '#D62828', intensidad: 0.5 },
}

/**
 * Cada color intermedio del selector crea un material: la caché guarda los más recientes y libera el resto.
 * Liberar uno que aún usa alguna pieza no la rompe: three lo vuelve a preparar al pintarla.
 */
export const LIMITE_MATERIALES = 256

// Un Map recorre en orden de inserción: el primero es el usado hace más tiempo.
const cache = new Map<string, Material>()

export const materialesEnCache = (): number => cache.size

function crear(material: MaterialPBR, color: string, estado: EstadoPieza): Material {
  const { rugosidad, metalicidad, opacidad } = PBR[material]
  const comunes = { color, roughness: rugosidad, metalness: metalicidad }
  // El cristal de ventana deja ver y pasar luz cálida; el vidrio de placas y hornos es oscuro y se pinta opaco.
  const m = material === 'cristal'
    ? new MeshPhysicalMaterial({ ...comunes, transparent: true, opacity: opacidad, emissive: '#fff6e0', emissiveIntensity: 0.4 })
    : material === 'vidrio'
      ? new MeshPhysicalMaterial(comunes)
      : new MeshStandardMaterial(comunes)
  if (estado !== 'normal') {
    m.emissive.set(RESALTE[estado].color)
    m.emissiveIntensity = RESALTE[estado].intensidad
  }
  return m
}

/** Material compartido por material, color y estado. */
export function materialDe(material: MaterialPBR, color: string, estado: EstadoPieza = 'normal'): Material {
  const clave = `${material}|${color}|${estado}`
  const m = cache.get(clave) ?? crear(material, color, estado)
  cache.delete(clave)
  cache.set(clave, m)
  for (const [viejo, sobrante] of cache) {
    if (cache.size <= LIMITE_MATERIALES) break
    cache.delete(viejo)
    sobrante.dispose()
  }
  return m
}
