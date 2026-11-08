import { valorVariante, type DefinicionTipo } from '../tipos'
import type { Elemento } from '../../modelo/documento'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { zonaCaja } from '../aperturas'
import { cajaMundo } from '../transformar'
import { caja, patas4 } from '../modelos'

/** Lo que la ropa de cama (almohadas de 10, edredón de 6) sube sobre el colchón, y el hueco entre almohadas y hasta los bordes. */
const ROPA = 10
const HUECO = 5
/** Grueso del colchón: la base (patas y somier, canapé, cajones o nido) llega hasta `alto − COLCHON`. */
const COLCHON = 22
/** Las bases cerradas necesitan al menos 18 cm bajo el colchón: con menos de 40 de alto solo hay patas. */
const ALTO_MINIMO_BASE = 40
/** Lo que sale un cajón bajo la cama por el lado largo, y cuánto se queda la cama nido más estrecha que la de arriba. */
const RECORRIDO_CAJON = 50
const NIDO_MAS_ESTRECHA = 10
/** La tapa del canapé se levanta desde la cabecera; a unos 60° el pie sube 0,85 veces el fondo sobre el colchón. */
const TAPA_CANAPE = 0.85
/** Grueso de los frentes laterales (cajones y nido). */
const FRENTE = 2

const BASES = ['patas', 'canape', 'cajones', 'nido']
type Base = 'patas' | 'canape' | 'cajones' | 'nido'
type Lado = 'izquierda' | 'derecha' | 'ambos'

const baseDe = (e: Elemento): Base => valorVariante(cama, e, 'base') as Base
const ladoDe = (e: Elemento): Lado => valorVariante(cama, e, 'lado') as Lado
const conCabecero = (e: Elemento) => valorVariante(cama, e, 'cabecero') === true
/** Lados largos con cajón o nido: −1 el izquierdo, +1 el derecho. */
const ladosDe = (e: Elemento): number[] => {
  const l = ladoDe(e)
  return l === 'ambos' ? [-1, 1] : l === 'izquierda' ? [-1] : [1]
}

export const cama: DefinicionTipo = {
  id: 'cama', nombre: 'cama', genero: 'f', categoria: 'mueble', estancias: ['dormitorio'],
  medidas: { ancho: { min: 80, max: 220, defecto: 150 }, fondo: { min: 180, max: 220, defecto: 200 }, alto: { min: 20, max: 70, defecto: 45 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [
    { clave: 'cabecero', etiqueta: 'Cabecero', valores: [true, false], defecto: true },
    {
      clave: 'base', etiqueta: 'Base', valores: BASES, defecto: 'patas',
      etiquetas: { patas: 'Patas', canape: 'Canapé', cajones: 'Cajones', nido: 'Cama nido' },
      valoresPara: (e) => (e.medidas.alto >= ALTO_MINIMO_BASE ? BASES : ['patas']),
      ocultarConUnValor: true,
    },
    {
      // Solo dice algo con nido (un lado) o cajones (uno o los dos): con patas o canapé queda un único valor y no se enseña.
      clave: 'lado', etiqueta: 'Lado', valores: ['izquierda', 'derecha', 'ambos'], defecto: 'derecha',
      valoresPara: (e) => (baseDe(e) === 'nido' ? ['izquierda', 'derecha'] : baseDe(e) === 'cajones' ? ['izquierda', 'derecha', 'ambos'] : ['derecha']),
      ocultarConUnValor: true,
    },
  ],
  zonasColor: [
    { clave: 'estructura', etiqueta: 'Estructura', material: 'madera', materiales: ['madera', 'lacado', 'metal'], defecto: '#8b6b4a' },
    { clave: 'ropa', etiqueta: 'Ropa de cama', material: 'tela', defecto: '#d9d4c7' },
  ],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  // La base cerrada ocupa lo mismo que las patas a efectos de choque; lo que sale (tapa, cajones, nido) va en las aperturas.
  volumenes(e) {
    const { ancho, fondo, alto } = e.medidas
    const base = cajaMundo(e, -ancho / 2, -fondo / 2, ancho / 2, fondo / 2, 0, alto)
    if (!conCabecero(e)) return [base]
    return [base, cajaMundo(e, -ancho / 2, -fondo / 2, ancho / 2, -fondo / 2 + 6, 0, 100)]
  },
  // Base (según la variante), colchón hasta 10 cm bajo el alto, y encima las almohadas y el edredón hasta el alto.
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const y0 = conCabecero(e) ? -fondo / 2 + 6 : -fondo / 2
    const tope = alto - ROPA
    const zColchon = Math.max(alto - COLCHON, 0)
    const zSomier = Math.max(zColchon - 8, 0)
    const n = ancho >= 120 ? 2 : 1
    const wAlmohada = Math.min(80, (ancho - HUECO * (n + 1)) / n)
    const xAlmohada = -(n * wAlmohada + (n - 1) * HUECO) / 2
    const base = baseDe(e)
    const lados = base === 'cajones' || base === 'nido' ? ladosDe(e) : []
    const piezas: PiezaLocal[] = []
    if (base === 'patas') {
      if (zSomier > 0) piezas.push(...patas4(e, 6, zSomier, 'estructura', 2))
      if (zColchon > 0) piezas.push(caja(-ancho / 2, y0, zSomier, ancho / 2, fondo / 2, zColchon, 'estructura'))
    } else {
      // Bloque cerrado hasta el colchón; en los lados con frente se retranquea lo que mide el frente.
      const x0 = -ancho / 2 + (lados.includes(-1) ? FRENTE : 0)
      const x1 = ancho / 2 - (lados.includes(1) ? FRENTE : 0)
      piezas.push(caja(x0, y0, 0, x1, fondo / 2, zColchon, 'estructura', 1))
      for (const lado of lados) {
        const [fx0, fx1] = lado < 0 ? [-ancho / 2, -ancho / 2 + FRENTE] : [ancho / 2 - FRENTE, ancho / 2]
        if (base === 'nido') {
          piezas.push(caja(fx0, y0 + HUECO, 5, fx1, fondo / 2 - HUECO, zColchon - 1, 'estructura'))
        } else {
          // Dos cajones por lado, entre 15 cm de la cabecera y 15 de los pies.
          const [ya, yb] = [y0 + 15, fondo / 2 - 15]
          const largo = (yb - ya - 0.4) / 2
          piezas.push(caja(fx0, ya, 5, fx1, ya + largo, zColchon - 1, 'estructura'), caja(fx0, ya + largo + 0.4, 5, fx1, yb, zColchon - 1, 'estructura'))
        }
      }
    }
    piezas.push(
      caja(-ancho / 2, y0, zColchon, ancho / 2, fondo / 2, tope, 'ropa', 2),
      ...Array.from({ length: n }, (_, i) => {
        const x0 = xAlmohada + i * (wAlmohada + HUECO)
        return caja(x0, y0 + HUECO, tope, x0 + wAlmohada, y0 + HUECO + 40, alto, 'ropa', 4)
      }),
      caja(-ancho / 2, y0 + 50, tope, ancho / 2, fondo / 2, tope + 6, 'ropa', 3),
    )
    if (conCabecero(e)) piezas.push(caja(-ancho / 2, -fondo / 2, 0, ancho / 2, -fondo / 2 + 6, 100, 'estructura'))
    return piezas
  },
  zonasApertura(e) {
    const { ancho, fondo, alto } = e.medidas
    const y0 = conCabecero(e) ? -fondo / 2 + 6 : -fondo / 2
    const zColchon = alto - COLCHON
    switch (baseDe(e)) {
      case 'canape':
        return [zonaCaja(e, 'la tapa del canapé', -ancho / 2, y0 + fondo / 2, ancho / 2, fondo / 2, alto, alto + TAPA_CANAPE * fondo)]
      case 'cajones':
        return ladosDe(e).map((lado) => {
          const [x0, x1] = lado < 0 ? [-ancho / 2 - RECORRIDO_CAJON, -ancho / 2] : [ancho / 2, ancho / 2 + RECORRIDO_CAJON]
          return zonaCaja(e, 'el cajón', x0, y0 + 15, x1, fondo / 2 - 15, 5, zColchon)
        })
      case 'nido':
        return ladosDe(e).map((lado) => {
          const salida = ancho - NIDO_MAS_ESTRECHA
          const [x0, x1] = lado < 0 ? [-ancho / 2 - salida, -ancho / 2] : [ancho / 2, ancho / 2 + salida]
          return zonaCaja(e, 'la cama nido', x0, y0 + HUECO, x1, fondo / 2 - HUECO, 5, zColchon)
        })
      default:
        return []
    }
  },
}
