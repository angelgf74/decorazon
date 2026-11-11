import { elementoNuevo, piezasDeElemento, type DefinicionTipo } from '../nucleo'

/**
 * Se sube a mano al cambiar cómo se dibujan las miniaturas sin que cambien los modelos: luces, cámara, materiales,
 * el contorno (`contorno.ts` y `CONTORNO` en el script), texturas o teselación (`vista3d/geometrias.ts`, los
 * segmentos de `vista3d/Pieza.tsx`). Entra en la firma de todos los tipos, así que el test de vigencia pide
 * regenerarlas (`npm run miniaturas`). Olvidarlo no deja imágenes viejas en ninguna caché (la URL lleva el resumen de
 * los bytes): solo deja las miniaturas sin regenerar.
 *
 * 2 (11 nov 2026): contorno de silueta de 2 px.
 */
export const VERSION_DEL_DIBUJO = 2

/** 0,1 mm en metros: Node y Chromium pueden diferir en el último bit de un seno, nunca en la cuarta cifra. */
const DECIMALES = 1e4

/** FNV-1a de 32 bits, en 8 cifras hexadecimales. */
function fnv1a(texto: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/**
 * La firma de lo que pinta la miniatura de un tipo: sus piezas 3D con las medidas, variantes, colores y materiales por
 * defecto. Si un modelo cambia, cambia su firma y el test de vigencia dice qué miniatura regenerar.
 */
export function firmaDelModelo(def: DefinicionTipo): string {
  const piezas = piezasDeElemento(elementoNuevo(def, { x: 0, y: 0 }, 'miniatura'), def)
  const json = JSON.stringify(piezas, (_, v: unknown) => (typeof v === 'number' ? Math.round(v * DECIMALES) / DECIMALES : v))
  return fnv1a(`${VERSION_DEL_DIBUJO}:${json}`)
}
