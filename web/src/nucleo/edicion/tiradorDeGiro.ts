import { contienePunto } from '../geometria/poligono'
import { rotar, sumar } from '../geometria/vector'
import type { Elemento, Punto } from '../modelo/documento'

/**
 * Dónde dibujar el tirador de giro de `e`, a `separacion` cm de su caja, y el `desfase` (grados) que hay que restar al
 * ángulo del puntero para que, con éste sobre el tirador, el giro no cambie.
 * Prueba delante, detrás, derecha e izquierda y se queda con el primero que cae dentro de la planta; si ninguno, delante.
 */
export function tiradorDeGiro(planta: Punto[], e: Elemento, separacion: number): { centro: Punto; desfase: number } {
  const { ancho, fondo } = e.medidas
  const lejos = (local: Punto) => sumar(e.posicion, rotar(local, e.rotacion))
  const candidatos = [
    { local: { x: 0, y: fondo / 2 + separacion }, desfase: 0 },
    { local: { x: 0, y: -(fondo / 2 + separacion) }, desfase: 180 },
    { local: { x: ancho / 2 + separacion, y: 0 }, desfase: -90 },
    { local: { x: -(ancho / 2 + separacion), y: 0 }, desfase: 90 },
  ].map(({ local, desfase }) => ({ centro: lejos(local), desfase }))
  return candidatos.find((c) => contienePunto(planta, c.centro)) ?? candidatos[0]!
}
