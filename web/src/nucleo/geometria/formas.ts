import { rotar, sumar, type Punto } from './vector'

/** Rectángulo con 4 vértices en sentido horario en pantalla; rotación en grados (horaria). */
export function rectangulo(centro: Punto, ancho: number, fondo: number, rotacion: number): Punto[] {
  const w = ancho / 2, f = fondo / 2
  return [{ x: -w, y: -f }, { x: w, y: -f }, { x: w, y: f }, { x: -w, y: f }]
    .map((p) => sumar(centro, rotar(p, rotacion)))
}

/** Lo más que un vértice del sector circunscrito puede quedar fuera del arco real (la mitad de TOLERANCIA_CM). */
export const HOLGURA_SECTOR_CM = 0.05

/** Mínimo número de segmentos (>= 16) tal que radio·(1/cos(paso/2) − 1) <= HOLGURA_SECTOR_CM. */
function segmentosSector(radio: number, spanGrados: number): number {
  let n = 16
  while (radio * (1 / Math.cos(((spanGrados / n) * Math.PI) / 360) - 1) > HOLGURA_SECTOR_CM) n++
  return n
}

/**
 * Sector circular como polígono circunscrito: el centro y los vértices a radio/cos(paso/2),
 * de modo que cada arista es tangente al arco y el polígono contiene el sector real.
 * Ángulos en grados con la misma convención que `rotar` (0° = +x, 90° = +y, hacia abajo).
 * Sin `segmentos`, usa el mínimo (>= 16) con el que ningún vértice sobresale más de HOLGURA_SECTOR_CM del arco.
 */
export function sectorCircunscrito(centro: Punto, radio: number, desdeGrados: number, hastaGrados: number, segmentos?: number): Punto[] {
  const span = Math.abs(hastaGrados - desdeGrados)
  if (span === 0 || span > 180) throw new RangeError('el span del sector debe estar en (0, 180] grados')
  segmentos ??= segmentosSector(radio, span)
  if (segmentos < 1) throw new RangeError('segmentos debe ser >= 1')
  const paso = (hastaGrados - desdeGrados) / segmentos
  if (Math.abs(paso) >= 90) throw new RangeError('el paso angular debe ser < 90 grados')
  const r = radio / Math.cos((paso * Math.PI) / 360)
  const vertices: Punto[] = [centro]
  for (let i = 0; i <= segmentos; i++) {
    vertices.push(sumar(centro, rotar({ x: r, y: 0 }, desdeGrados + i * paso)))
  }
  return vertices
}
