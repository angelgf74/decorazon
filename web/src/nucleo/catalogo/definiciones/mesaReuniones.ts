import { valorVariante, type DefinicionTipo } from '../tipos'
import type { Elemento } from '../../modelo/documento'
import { huellaEntera, huellaOvalada, tableroConPatas } from '../aperturas'
import { cajaMundo } from '../transformar'
import { cilindro, mesaConPatas, ovalo, VARIANTE_PATAS } from '../modelos'

/** Radio de cada pie de la ovalada, en cm. */
const PIE = 6

const ovalada = (e: Elemento) => valorVariante(mesaReuniones, e, 'forma') === 'ovalada'

/** x local de los dos pies de la ovalada: en el centro de cada extremo redondo. */
function pies(e: Elemento): number[] {
  const x = (e.medidas.ancho - e.medidas.fondo) / 2
  return [-x, x]
}

export const mesaReuniones: DefinicionTipo = {
  id: 'mesa-reuniones', nombre: 'mesa de reuniones', genero: 'f', categoria: 'mueble', estancias: ['despacho'],
  medidas: { ancho: { min: 160, max: 400, defecto: 240 }, fondo: { min: 90, max: 150, defecto: 110 }, alto: { min: 72, max: 78, defecto: 75 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [
    { clave: 'forma', etiqueta: 'Forma', valores: ['rectangular', 'ovalada'], defecto: 'rectangular' },
    // La ovalada ya va sobre pies redondos.
    { ...VARIANTE_PATAS, valoresPara: (e) => (ovalada(e) ? ['redondas'] : VARIANTE_PATAS.valores), ocultarConUnValor: true },
  ],
  zonasColor: [{ clave: 'tablero', etiqueta: 'Tablero', material: 'madera', materiales: ['madera', 'lacado'], defecto: '#a98462' }, { clave: 'patas', etiqueta: 'Patas', material: 'metal', materiales: ['metal', 'madera', 'lacado'], defecto: '#3a3a3a' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes(e) {
    if (!ovalada(e)) return tableroConPatas(e)
    const { alto } = e.medidas
    return [
      { huella: huellaOvalada(e), zMin: e.alturaSuelo + alto - 3, zMax: e.alturaSuelo + alto },
      ...pies(e).map((x) => cajaMundo(e, x - PIE, -PIE, x + PIE, PIE, 0, alto - 3)),
    ]
  },
  planta: (e) => (ovalada(e) ? [huellaOvalada(e)] : huellaEntera(e)),
  modelo3d(e) {
    if (!ovalada(e)) return mesaConPatas(e, 'tablero', 'patas')
    const { alto } = e.medidas
    return [...ovalo(e, alto - 3, alto, 'tablero'), ...pies(e).map((x) => cilindro(x, 0, PIE, 0, alto - 3, 'patas'))]
  },
  zonasApertura: () => [],
}
