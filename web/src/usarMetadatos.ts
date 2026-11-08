import { useEffect } from 'react'
import { textos } from './textos'

export type PaginaConMetadatos = keyof typeof textos.seo

/** Lo único que se indexa (y lo que lleva `public/sitemap.xml`); las páginas de cuenta van con `noindex`. */
export const PAGINAS_INDEXABLES = ['inicio', 'disenar', 'comoFunciona', 'privacidad'] as const satisfies readonly PaginaConMetadatos[]

/** La etiqueta `<meta name>` o `<link rel>` del head, o null si no está. */
const buscar = <E extends Element>(selector: string) => document.head.querySelector<E>(selector)

function asegurar<E extends HTMLElement>(selector: string, crear: () => E): E {
  const hecho = buscar<E>(selector)
  if (hecho !== null) return hecho
  const nuevo = crear()
  document.head.appendChild(nuevo)
  return nuevo
}

/**
 * Título, descripción, canonical y, si no se indexa, `noindex` de la página mientras está montada (SEO, sin dependencias:
 * la SPA solo tiene un index.html y Google lee lo que deja el JavaScript). Al desmontar deja el head como estaba.
 * El canonical es la ruta sin búsqueda ni fragmento; una página que no se indexa no lo lleva.
 */
export function useMetadatos(titulo: string, descripcion?: string, { indexar = true }: { indexar?: boolean } = {}): void {
  useEffect(() => {
    const antes = {
      titulo: document.title,
      descripcion: buscar<HTMLMetaElement>('meta[name="description"]')?.content,
      canonical: buscar<HTMLLinkElement>('link[rel="canonical"]'),
      robots: buscar<HTMLMetaElement>('meta[name="robots"]'),
    }
    document.title = titulo
    if (descripcion !== undefined) {
      asegurar('meta[name="description"]', () => Object.assign(document.createElement('meta'), { name: 'description' })).content = descripcion
    }
    const canonicalAntes = antes.canonical?.href
    if (indexar) {
      asegurar('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' })).href =
        window.location.origin + window.location.pathname
    } else antes.canonical?.remove()
    let robots: HTMLMetaElement | null = null
    if (!indexar && antes.robots === null) {
      robots = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex' })
      document.head.appendChild(robots)
    }
    return () => {
      document.title = antes.titulo
      const meta = buscar<HTMLMetaElement>('meta[name="description"]')
      if (meta !== null && antes.descripcion !== undefined) meta.content = antes.descripcion
      else if (meta !== null && antes.descripcion === undefined) meta.remove()
      if (antes.canonical !== null) {
        if (!antes.canonical.isConnected) document.head.appendChild(antes.canonical)
        antes.canonical.href = canonicalAntes!
      } else buscar('link[rel="canonical"]')?.remove()
      robots?.remove()
    }
  }, [titulo, descripcion, indexar])
}
