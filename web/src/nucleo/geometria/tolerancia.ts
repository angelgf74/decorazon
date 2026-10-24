// Tolerancia geométrica única del núcleo: 1 mm, en centímetros.
export const TOLERANCIA_CM = 0.1

// Margen para absorber el ruido de coma flotante al redondear.
const RUIDO = 1e-6

/** Redondea al centímetro hacia arriba, ignorando ruido numérico. */
export function redondearArriba(cm: number): number {
  return Math.ceil(cm - RUIDO)
}

/** Redondea al centímetro hacia abajo, ignorando ruido numérico. */
export function redondearAbajo(cm: number): number {
  return Math.floor(cm + RUIDO)
}

/** Cifra a mostrar en un conflicto: penetración sin tolerancia, al cm hacia arriba. */
export function cantidadMostrada(penetracion: number): number {
  return redondearArriba(penetracion - TOLERANCIA_CM)
}
