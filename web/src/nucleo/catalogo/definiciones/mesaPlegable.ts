import { valorVariante, type DefinicionTipo } from '../tipos'
import type { Elemento } from '../../modelo/documento'
import type { Prisma } from '../../geometria/prisma'
import { cajaMundo } from '../transformar'
import { caja, extrusion } from '../modelos'

/** Lo que ocupa contra la pared cerrada: listón de 3 cm y el tablero colgando delante. */
const CERRADA_CM = 6

const abierta = (e: Elemento) => valorVariante(mesaPlegable, e, 'abierta') === true

/** Abierta: listón, tablero y una escuadra debajo (el suelo queda libre). Cerrada: listón y tablero colgando, pegados a la pared. */
function volumenes(e: Elemento): Prisma[] {
  const { ancho, fondo, alto } = e.medidas
  const liston = cajaMundo(e, -ancho / 2, -fondo / 2, ancho / 2, -fondo / 2 + 3, alto - 20, alto)
  if (!abierta(e)) return [liston, cajaMundo(e, -ancho / 2, -fondo / 2 + 3, ancho / 2, -fondo / 2 + CERRADA_CM, Math.max(0, alto - fondo), alto)]
  return [
    liston,
    cajaMundo(e, -ancho / 2, -fondo / 2, ancho / 2, fondo / 2, alto - 3, alto),
    cajaMundo(e, -1.5, -fondo / 2 + 3, 1.5, -fondo / 2 + fondo * 0.6, alto - 30, alto - 3),
  ]
}

export const mesaPlegable: DefinicionTipo = {
  id: 'mesa-plegable', nombre: 'mesa plegable', genero: 'f', categoria: 'mueble', estancias: ['cocina', 'salon', 'despacho'],
  medidas: { ancho: { min: 60, max: 120, defecto: 80 }, fondo: { min: 40, max: 80, defecto: 60 }, alto: { min: 70, max: 80, defecto: 75 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'abierta', etiqueta: 'Abierta', valores: [true, false], defecto: true }],
  zonasColor: [{ clave: 'tablero', etiqueta: 'Tablero', material: 'madera', materiales: ['madera', 'lacado'], defecto: '#a98462' }, { clave: 'soporte', etiqueta: 'Soporte', material: 'metal', defecto: '#3a3a3a' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes,
  // En el plano, listón y tablero; la escuadra queda debajo.
  planta: (e) => volumenes(e).slice(0, 2).map((v) => v.huella),
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const liston = caja(-ancho / 2, -fondo / 2, alto - 20, ancho / 2, -fondo / 2 + 3, alto, 'soporte')
    if (!abierta(e)) return [liston, caja(-ancho / 2, -fondo / 2 + 3, Math.max(0, alto - fondo), ancho / 2, -fondo / 2 + CERRADA_CM, alto, 'tablero')]
    // La escuadra: un triángulo de perfil (del listón al tablero) con el hueco en medio, de 3 cm de grueso.
    const escuadra: [number, number][] = [[-fondo / 2 + 3, alto - 3], [-fondo / 2 + fondo * 0.6, alto - 3], [-fondo / 2 + 3, alto - 30]]
    const [cy, cz] = [0, 1].map((k) => escuadra.reduce((s, p) => s + p[k]!, 0) / 3)
    const hueco = escuadra.map(([y, z]): [number, number] => [cy! + (y - cy!) * 0.55, cz! + (z - cz!) * 0.55])
    return [
      liston,
      caja(-ancho / 2, -fondo / 2, alto - 3, ancho / 2, fondo / 2, alto, 'tablero'),
      extrusion('perfil', escuadra, -1.5, 1.5, 'soporte', [hueco]),
    ]
  },
  zonasApertura: () => [],
}
