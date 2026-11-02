import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera, ESPACIO_DE_ENTRADA_CM, espacioDelante, huellaEntera } from '../aperturas'
import { aMundo, cajaMundo } from '../transformar'
import { sectorCircunscrito } from '../../geometria/formas'
import type { Elemento } from '../../modelo/documento'
import { caja, cilindro, mampara, oscurecer } from '../modelos'

/** Alto de la mampara sobre el plato y ancho máximo de su puerta abatible, en cm. */
const MAMPARA = 195
const PUERTA = 70
const LOZA = '#f4f4f2'

/** Hasta dónde llega el cristal en x: la fija cubre la mitad izquierda; la corredera y la abatible, todo el frente. */
function finMampara(e: Elemento): number | null {
  const m = valorVariante(ducha, e, 'mampara')
  if (m === 'ninguna') return null
  return m === 'fija' ? 0 : e.medidas.ancho / 2
}

export const ducha: DefinicionTipo = {
  id: 'ducha', nombre: 'plato de ducha', genero: 'm', categoria: 'mueble', estancias: ['bano'],
  medidas: { ancho: { min: 70, max: 180, defecto: 120 }, fondo: { min: 70, max: 100, defecto: 80 }, alto: { min: 3, max: 15, defecto: 5 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'mampara', etiqueta: 'Mampara', valores: ['ninguna', 'fija', 'corredera', 'abatible'], defecto: 'corredera' }],
  zonasColor: [
    { clave: 'plato', etiqueta: 'Plato', material: 'ceramica', defecto: LOZA },
    { clave: 'perfil', etiqueta: 'Perfiles', material: 'metal', defecto: '#c0c2c4' },
  ],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes(e) {
    const { ancho, fondo, alto } = e.medidas
    const plato = cajaEntera(e)
    const x1 = finMampara(e)
    return x1 === null ? plato : [...plato, cajaMundo(e, -ancho / 2, fondo / 2 - 1, x1, fondo / 2, alto, alto + MAMPARA)]
  },
  planta: huellaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const x1 = finMampara(e)
    return [
      // El hueco asoma 1 mm sobre el plato y el desagüe 1 mm sobre el hueco: así ninguna cara de arriba coincide y no parpadean.
      caja(-ancho / 2, -fondo / 2, 0, ancho / 2, fondo / 2, alto - 0.2, 'plato'),
      { ...caja(-ancho / 2 + 4, -fondo / 2 + 4, alto - 0.5, ancho / 2 - 4, fondo / 2 - 4, alto - 0.1, 'plato'), color: oscurecer(e.colores.plato ?? LOZA, 0.9) },
      cilindro(0, 0, 4, alto - 0.4, alto, 'perfil'),
      ...(x1 === null ? [] : mampara(e, -ancho / 2, x1, alto, alto + MAMPARA, 'perfil')),
    ]
  },
  zonasApertura(e) {
    const { ancho, fondo, alto } = e.medidas
    if (valorVariante(ducha, e, 'mampara') !== 'abatible') return espacioDelante(e, 'el espacio de entrada', ESPACIO_DE_ENTRADA_CM)
    // La puerta abre hacia fuera con la bisagra en el extremo izquierdo; su barrido sustituye al espacio de entrada.
    const sector = sectorCircunscrito({ x: -ancho / 2, y: fondo / 2 }, Math.min(ancho, PUERTA), 0, 90)
    return [{ nombre: 'la mampara', huella: sector.map((p) => aMundo(e, p)), zMin: e.alturaSuelo + alto, zMax: e.alturaSuelo + alto + MAMPARA }]
  },
}
