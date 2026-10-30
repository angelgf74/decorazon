export const CONTRASENA_MINIMA = 12
export const CONTRASENA_MAXIMA = 128

export function longitudDeContrasenaValida(contrasena: string): boolean {
  return contrasena.length >= CONTRASENA_MINIMA && contrasena.length <= CONTRASENA_MAXIMA
}
