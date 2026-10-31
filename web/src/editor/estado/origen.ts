export type Origen = { tipo: 'anonimo' } | { tipo: 'servidor'; id: string; version: number; nombre: string }

export const ORIGEN_ANONIMO: Origen = { tipo: 'anonimo' }
