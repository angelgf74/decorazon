import { catalogoBase, detectarConflictos, type Conflicto, type DocumentoDiseno } from '../../nucleo'
import { useEditor } from './almacen'

const SIN_CONFLICTOS: Conflicto[] = []
let ultimoDocumento: DocumentoDiseno | null = null
let ultimoResultado: Conflicto[] = SIN_CONFLICTOS

export function conflictosDe(doc: DocumentoDiseno | null): Conflicto[] {
  if (doc === null) return SIN_CONFLICTOS
  if (doc !== ultimoDocumento) {
    ultimoResultado = detectarConflictos(doc, catalogoBase)
    ultimoDocumento = doc
  }
  return ultimoResultado
}

export function useConflictos(): Conflicto[] {
  return conflictosDe(useEditor((e) => e.documento))
}
