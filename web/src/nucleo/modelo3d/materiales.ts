import type { MaterialPBR } from './tipos'

export const PBR: Record<MaterialPBR, { rugosidad: number; metalicidad: number; opacidad: number }> = {
  tela: { rugosidad: 0.95, metalicidad: 0, opacidad: 1 },
  madera: { rugosidad: 0.6, metalicidad: 0, opacidad: 1 },
  lacado: { rugosidad: 0.3, metalicidad: 0, opacidad: 1 },
  metal: { rugosidad: 0.35, metalicidad: 0.85, opacidad: 1 },
  vidrio: { rugosidad: 0.05, metalicidad: 0, opacidad: 0.25 },
  ceramica: { rugosidad: 0.2, metalicidad: 0, opacidad: 1 },
  pared: { rugosidad: 0.9, metalicidad: 0, opacidad: 1 },
  suelo: { rugosidad: 0.7, metalicidad: 0, opacidad: 1 },
}
