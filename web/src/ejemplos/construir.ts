import { catalogoBase, documentoNuevo, elementoNuevo, type DocumentoDiseno, type Elemento, type Puerta, type TipoEstancia, type Ventana } from '../nucleo'

/** Un mueble del catálogo con sus medidas por defecto, centrado en (x, y); giro 0 = frente hacia abajo (como al soltarlo). */
export function mueble(tipo: string, id: string, x: number, y: number, rotacion = 0): Elemento {
  const def = catalogoBase.get(tipo)
  if (!def) throw new Error(`El ejemplo usa un tipo que no existe: ${tipo}`)
  return { ...elementoNuevo(def, { x, y }, id), rotacion }
}

/** Puerta abatible de 80 × 210 que abre hacia dentro; `posicion` desde el inicio de la pared (las paredes van en sentido horario). */
export function puerta(id: string, pared: number, posicion: number, ancho = 80): Puerta {
  return { id, tipo: 'puerta', pared, posicion, ancho, alto: 210, hoja: 'abatible', bisagra: 'izquierda', abreHacia: 'dentro' }
}

/** Ventana de 120 de alto que abre hacia dentro, a `alturaSuelo` cm del suelo (más alta en una cocina, por encima de la encimera). */
export function ventana(id: string, pared: number, posicion: number, ancho = 120, alturaSuelo = 100): Ventana {
  return { id, tipo: 'ventana', pared, posicion, ancho, alto: 120, alturaSuelo, abreHaciaDentro: true }
}

export function estancia(tipo: TipoEstancia, ancho: number, largo: number, partes: Pick<DocumentoDiseno, 'aberturas' | 'elementos'>): DocumentoDiseno {
  return { ...documentoNuevo(tipo, ancho, largo, 250), ...partes }
}
