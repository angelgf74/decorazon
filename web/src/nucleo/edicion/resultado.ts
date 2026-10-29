import type { DocumentoDiseno } from '../modelo/documento'

export type ResultadoEdicion = { ok: true; documento: DocumentoDiseno } | { ok: false; motivo: string }
