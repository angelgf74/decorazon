import type { DocumentoDiseno, TipoEstancia } from '../nucleo'
import { estancia, mueble, puerta, ventana } from './construir'

export interface Ejemplo {
  id: string
  nombre: string
  tipo: TipoEstancia
  documento: DocumentoDiseno
  /** Vista 3D del ejemplo, en `public/ejemplos` (se regenera con «Descargar imagen 3D» sobre una copia). */
  imagen: string
}

// Paredes en sentido horario desde (0, 0): 0 arriba (izquierda → derecha), 1 derecha (arriba → abajo), 2 abajo
// (derecha → izquierda), 3 izquierda (abajo → arriba). Las posiciones de puertas y ventanas se miden desde el inicio de
// su pared. Los muebles van centrados y con el frente hacia abajo (giro 0) o hacia arriba (180).

/** Dormitorio de 400 × 330: cama contra la pared de arriba con sus mesitas, armario abajo a la izquierda, cómoda y lámpara. */
const dormitorio: DocumentoDiseno = estancia('dormitorio', 400, 330, {
  aberturas: [puerta('puerta', 2, 20), ventana('ventana', 1, 60)],
  elementos: [
    mueble('cama', 'cama', 170, 100),
    mueble('mesita', 'mesita-izquierda', 67, 20),
    mueble('mesita', 'mesita-derecha', 273, 20),
    mueble('comoda', 'comoda', 350, 25),
    mueble('armario', 'armario', 70, 300, 180),
    mueble('lampara-pie', 'lampara', 380, 200),
  ],
})

/** Salón de 450 × 380: sofá frente al mueble de TV, mesa de centro, sillón, lámpara, y estantería con una planta al lado; la puerta abajo a la izquierda. */
const salon: DocumentoDiseno = estancia('salon', 450, 380, {
  aberturas: [puerta('puerta', 3, 30), ventana('ventana', 1, 100, 150)],
  elementos: [
    mueble('sofa', 'sofa', 225, 335, 180),
    mueble('mesa-centro', 'mesa-centro', 225, 220),
    mueble('mueble-tv', 'mueble-tv', 225, 20),
    mueble('estanteria', 'estanteria', 60, 15),
    mueble('sillon', 'sillon', 390, 300, 180),
    mueble('lampara-pie', 'lampara', 400, 60),
    mueble('planta', 'planta', 30, 100),
  ],
})

/** Cocina de 360 × 300: módulos, fregadero bajo la ventana y frigorífico en la pared de arriba; mesa con dos sillas. */
const cocina: DocumentoDiseno = estancia('cocina', 360, 300, {
  aberturas: [puerta('puerta', 2, 20), ventana('ventana', 0, 120, 120, 120)],
  elementos: [
    mueble('modulo-bajo', 'modulo-1', 30, 30),
    mueble('modulo-bajo', 'modulo-2', 90, 30),
    mueble('fregadero', 'fregadero', 150, 25),
    mueble('modulo-bajo', 'modulo-3', 220, 30),
    mueble('frigorifico', 'frigorifico', 280, 33),
    mueble('mesa', 'mesa', 180, 200),
    mueble('silla', 'silla-arriba', 150, 128),
    mueble('silla', 'silla-abajo', 150, 272, 180),
  ],
})

export const EJEMPLOS: Ejemplo[] = [
  { id: 'dormitorio', nombre: 'Dormitorio de matrimonio', tipo: 'dormitorio', documento: dormitorio, imagen: '/ejemplos/dormitorio.png' },
  { id: 'salon', nombre: 'Salón con sofá y TV', tipo: 'salon', documento: salon, imagen: '/ejemplos/salon.png' },
  { id: 'cocina', nombre: 'Cocina con mesa', tipo: 'cocina', documento: cocina, imagen: '/ejemplos/cocina.png' },
]
