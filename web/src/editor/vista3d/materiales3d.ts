import { MeshPhysicalMaterial, MeshStandardMaterial, type Material } from 'three'
import { PBR, type MaterialPBR } from '../../nucleo'

export type EstadoPieza = 'normal' | 'seleccionado' | 'conflicto'

const RESALTE: Record<Exclude<EstadoPieza, 'normal'>, { color: string; intensidad: number }> = {
  seleccionado: { color: '#B9473A', intensidad: 0.35 },
  conflicto: { color: '#D62828', intensidad: 0.5 },
}

const cache = new Map<string, Material>()

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
  let m = cache.get(clave)
  if (!m) {
    m = crear(material, color, estado)
    cache.set(clave, m)
  }
  return m
}
