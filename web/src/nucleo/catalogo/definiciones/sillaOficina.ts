import { valorVariante, type DefinicionTipo } from '../tipos'
import { asientoYRespaldo, huellaEntera } from '../aperturas'
import { caja, cilindro } from '../modelos'

/** Alto del asiento y de los brazos, y grueso del respaldo, en cm. */
const ASIENTO = 48
const BRAZOS = 68
const RESPALDO = 8

export const sillaOficina: DefinicionTipo = {
  id: 'silla-oficina', nombre: 'silla de oficina', genero: 'f', categoria: 'mueble', estancias: ['despacho'],
  medidas: { ancho: { min: 55, max: 70, defecto: 62 }, fondo: { min: 55, max: 70, defecto: 62 }, alto: { min: 90, max: 130, defecto: 110 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'brazos', etiqueta: 'Brazos', valores: [true, false], defecto: true }],
  zonasColor: [{ clave: 'tapizado', etiqueta: 'Tapizado', material: 'tela', defecto: '#3d4a5c' }, { clave: 'base', etiqueta: 'Base', material: 'metal', defecto: '#2b2b2b' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  // Sin brazos, el asiento choca hasta 4 cm por encima del cojín.
  volumenes: (e) => asientoYRespaldo(e, valorVariante(sillaOficina, e, 'brazos') ? BRAZOS : ASIENTO + 4, RESPALDO),
  planta: huellaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const radio = Math.min(ancho, fondo) / 2 - 3
    // Base de cinco radios de dos tramos redondos, con una rueda al final de cada uno.
    const radios = Array.from({ length: 5 }, (_, i) => (2 * Math.PI * i) / 5 - Math.PI / 2).flatMap((a) => [
      ...[0.35, 0.65].map((k) => cilindro(radio * k * Math.cos(a), radio * k * Math.sin(a), 2.5, 5, 8, 'base')),
      cilindro(radio * Math.cos(a), radio * Math.sin(a), 2.5, 0, 8, 'base'),
    ])
    const piezas = [
      ...radios,
      cilindro(0, 0, 4, 5, 9, 'base'),
      cilindro(0, 0, 3, 9, ASIENTO - 6, 'base'),
      caja(-ancho / 2 + 4, -fondo / 2 + RESPALDO, ASIENTO - 6, ancho / 2 - 4, fondo / 2 - 2, ASIENTO, 'tapizado'),
      caja(-ancho / 2 + 6, -fondo / 2, ASIENTO - 4, ancho / 2 - 6, -fondo / 2 + RESPALDO, alto, 'tapizado'),
    ]
    if (valorVariante(sillaOficina, e, 'brazos')) {
      for (const x of [-ancho / 2, ancho / 2 - 4]) {
        piezas.push(caja(x + 1, -3, ASIENTO, x + 3, 3, BRAZOS - 3, 'base'), caja(x, -12, BRAZOS - 3, x + 4, 12, BRAZOS, 'tapizado'))
      }
    }
    return piezas
  },
  zonasApertura: () => [],
}
