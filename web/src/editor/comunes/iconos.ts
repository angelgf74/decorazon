// Iconos de trazo en una rejilla de 24: cada uno es la lista de sus trazados (los pinta Icono.tsx).
export const TRAZADOS = {
  puerta: ['M3 20h5M20 20h1', 'M8 20V8', 'M8 8a12 12 0 0 1 12 12'],
  ventana: ['M4 5h16v14H4z', 'M12 5v14', 'M4 12h16'],
  columna: ['M7 7h10v10H7z', 'M7 17 17 7', 'M7 12l5-5', 'M12 17l5-5'],
  viga: ['M3 9h18', 'M3 15h18', 'M3 9v6M21 9v6', 'M8 12h2M14 12h2'],
  radiador: ['M5 6h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z', 'M8 6v12M12 6v12M16 6v12'],
  deshacer: ['M9 14 4 9l5-5', 'M4 9h10a6 6 0 0 1 0 12h-3'],
  rehacer: ['M15 14l5-5-5-5', 'M20 9H10a6 6 0 0 0 0 12h3'],
  encuadrar: ['M4 9V4h5', 'M15 4h5v5', 'M20 15v5h-5', 'M9 20H4v-5'],
  nuevo: ['M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z', 'M14 3v5h5', 'M12 11v6M9 14h6'],
  disenos: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  cuenta: ['M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z', 'M4 21a8 8 0 0 1 16 0'],
  guardar: ['M7 18a4 4 0 0 1-.6-7.95A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9', 'M12 12v8', 'M9 15l3-3 3 3'],
  estancia: ['M4 4h16v16H4z', 'M11 4v6', 'M4 13h9v7'],
  catalogo: ['M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3', 'M3 12a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3z', 'M5 17v2M19 17v2'],
  propiedades: ['M4 7h10M18 7h2', 'M4 17h4M12 17h8', 'M16 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z', 'M10 15a2 2 0 1 1 0 4 2 2 0 0 1 0-4z'],
  cerrar: ['M6 6l12 12M18 6 6 18'],
  ayuda: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', 'M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5v.7', 'M12 17h.01'],
  imprimir: ['M7 9V3h10v6', 'M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2', 'M7 14h10v7H7z'],
  buscar: ['M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z', 'M20 20l-4-4'],
  mas: ['M12 5v14M5 12h14'],
  menos: ['M5 12h14'],
  // Tres puntos: el menú de más acciones.
  puntos: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
  hecho: ['M5 12.5 9.5 17 19 7'],
  // Bocadillo con dos líneas de texto.
  sugerencia: ['M5 4h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-5 4v-4H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', 'M8 9h8M8 12h5'],
  // Asa de arrastre: dos columnas de tres puntos.
  mover: ['M9 6h.01', 'M15 6h.01', 'M9 12h.01', 'M15 12h.01', 'M9 18h.01', 'M15 18h.01'],
} satisfies Record<string, string[]>

export type NombreIcono = keyof typeof TRAZADOS

export const NOMBRES_ICONO = Object.keys(TRAZADOS) as NombreIcono[]
