export const CONTRASENA_MINIMA = 12
export const CONTRASENA_MAXIMA = 128
export const NOMBRE_MAXIMO = 100

export function longitudDeContrasenaValida(contrasena: string): boolean {
  return contrasena.length >= CONTRASENA_MINIMA && contrasena.length <= CONTRASENA_MAXIMA
}

export function nombreValido(nombre: string): boolean {
  const n = nombre.trim()
  return n.length >= 1 && n.length <= NOMBRE_MAXIMO
}
