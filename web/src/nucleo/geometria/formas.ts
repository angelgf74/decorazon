import { rotar, sumar, type Punto } from './vector'

/** Rectángulo con 4 vértices en sentido horario en pantalla; rotación en grados (horaria). */
export function rectangulo(centro: Punto, ancho: number, fondo: number, rotacion: number): Punto[] {
  const w = ancho / 2, f = fondo / 2
  return [{ x: -w, y: -f }, { x: w, y: -f }, { x: w, y: f }, { x: -w, y: f }]
    .map((p) => sumar(centro, rotar(p, rotacion)))
}

/**
 * Sector circular como polígono circunscrito: el centro y los vértices a radio/cos(paso/2),
 * de modo que cada arista es tangente al arco y el polígono contiene el sector real.
 * Ángulos en grados con la misma convención que `rotar` (0° = +x, 90° = +y, hacia abajo).
 */
export function sectorCircunscrito(centro: Punto, radio: number, desdeGrados: number, hastaGrados: number, segmentos = 16): Punto[] {
  const paso = (hastaGrados - desdeGrados) / segmentos
  const r = radio / Math.cos((paso * Math.PI) / 360)
  const vertices: Punto[] = [centro]
  for (let i = 0; i <= segmentos; i++) {
    vertices.push(sumar(centro, rotar({ x: r, y: 0 }, desdeGrados + i * paso)))
  }
  return vertices
}
