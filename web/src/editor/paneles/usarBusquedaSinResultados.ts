import { useEffect, useRef } from 'react'
import { evento } from '../../analitica'
import { catalogoBase } from '../../nucleo'

/** Lo que se espera sin teclear antes de contar la búsqueda: así se cuenta la palabra entera, no cada letra. */
export const ESPERA_BUSQUEDA_MS = 1500
const LARGO_MINIMO = 3
const LARGO_MAXIMO = 30

/** Sin tildes ni mayúsculas, como filtra el buscador del catálogo. */
export const normalizarBusqueda = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

// Un correo o un teléfono no son un mueble: nunca salen hacia la analítica.
const pareceDatoPersonal = (texto: string) => texto.includes('@') || /\d{4}/.test(texto)

/**
 * Cuenta (evento `catalogo-sin-resultados`, con el texto) lo que se busca en el catálogo y no existe en ningún grupo:
 * es lo que falta (M-16). Solo al dejar de escribir, con 3 letras o más, recortado a 30, una vez por texto mientras el
 * panel está montado, y nunca algo con @ o con cuatro cifras seguidas.
 */
export function useBusquedaSinResultados(busqueda: string): void {
  const contadas = useRef(new Set<string>())
  useEffect(() => {
    const texto = normalizarBusqueda(busqueda).slice(0, LARGO_MAXIMO)
    if (texto.length < LARGO_MINIMO || pareceDatoPersonal(texto) || contadas.current.has(texto)) return
    if ([...catalogoBase.values()].some((d) => normalizarBusqueda(d.nombre).includes(normalizarBusqueda(busqueda)))) return
    const espera = setTimeout(() => {
      contadas.current.add(texto)
      evento('catalogo-sin-resultados', { texto })
    }, ESPERA_BUSQUEDA_MS)
    return () => clearTimeout(espera)
  }, [busqueda])
}
