import { obtenerVistaPrevia } from '../servidor'

/**
 * Las miniaturas ya pedidas, por `id:fecha`: buscar u ordenar vuelve a montar las filas y no debe volver a pedirlas.
 * Una fecha nueva (la imagen se rehízo) es otra clave. Los object URL no se liberan: son pocos (cien diseños como mucho)
 * y duran lo que la página.
 */
const pedidas = new Map<string, Promise<string | null>>()

/** El object URL de la vista previa del diseño, o null si no llega (sin imagen, sin conexión…). */
export function urlDeMiniatura(id: string, fecha: string): Promise<string | null> {
  const clave = `${id}:${fecha}`
  let p = pedidas.get(clave)
  if (!p) {
    p = obtenerVistaPrevia(id).then((imagen) => URL.createObjectURL(imagen), () => null)
    pedidas.set(clave, p)
  }
  return p
}

/** Para los tests: olvida las imágenes pedidas. */
export function olvidarMiniaturas(): void {
  pedidas.clear()
}
