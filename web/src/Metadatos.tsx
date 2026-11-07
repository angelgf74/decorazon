import { textos } from './textos'
import { PAGINAS_INDEXABLES, useMetadatos, type PaginaConMetadatos } from './usarMetadatos'

/** Los metadatos de una página de `textos.seo`; se monta junto a la página en su ruta (`App.tsx`). */
export default function Metadatos({ pagina }: { pagina: PaginaConMetadatos }) {
  const t: { titulo: string; descripcion?: string } = textos.seo[pagina]
  useMetadatos(t.titulo, t.descripcion, { indexar: (PAGINAS_INDEXABLES as readonly string[]).includes(pagina) })
  return null
}
