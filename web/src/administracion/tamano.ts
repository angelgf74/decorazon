const UNIDADES = ['kB', 'MB', 'GB'] as const

/** Bytes en texto legible, en base 1024 (la del tope de 1 MB por diseño) y con coma decimal. */
export function formatoDeTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  let valor = bytes / 1024
  let unidad = 0
  while (valor >= 1024 && unidad < UNIDADES.length - 1) {
    valor /= 1024
    unidad++
  }
  return `${valor.toFixed(1).replace('.', ',')} ${UNIDADES[unidad]}`
}
