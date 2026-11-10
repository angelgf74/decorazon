import { valorVariante, type DefinicionTipo } from '../tipos'
import { asientoYRespaldo, huellaEntera } from '../aperturas'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { caja, cilindro, extrusion, revolucion, tubo } from '../modelos'
import { elipsoide } from '../perfiles'

/** Alto del asiento y de los brazos, y grueso del respaldo, en cm. */
const ASIENTO = 48
const BRAZOS = 68
const RESPALDO = 8
/** Grueso del respaldo tapizado: se curva lo que queda hasta los RESPALDO cm de su volumen. */
const GROSOR_RESPALDO = 3

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
  // Base de cinco brazos de tubo que bajan del buje a las ruedas; asiento redondeado y respaldo curvado hacia atrás en el centro
  // (dentro de sus RESPALDO cm). Los apoyabrazos, un soporte de tubo y una almohadilla redondeada.
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const radio = Math.min(ancho, fondo) / 2 - 3
    const base = Array.from({ length: 5 }, (_, i) => (2 * Math.PI * i) / 5 - Math.PI / 2).flatMap((a) => {
      const [x, y] = [radio * Math.cos(a), radio * Math.sin(a)]
      return [tubo([[0, 0, 7], [x, y, 6]], 1.6, 'base'), revolucion(x, y, elipsoide(2.5, 0, 5), 'base')]
    })
    const w = ancho / 2 - 6
    const xs = Array.from({ length: 9 }, (_, i) => -w + (2 * w * i) / 8)
    const atras = (x: number) => -fondo / 2 + (RESPALDO - GROSOR_RESPALDO) * (x / w) ** 2
    const curva: [number, number][] = [...xs.map((x): [number, number] => [x, atras(x)]), ...[...xs].reverse().map((x): [number, number] => [x, atras(x) + GROSOR_RESPALDO])]
    const piezas: PiezaLocal[] = [
      ...base,
      cilindro(0, 0, 4, 5, 9, 'base'),
      cilindro(0, 0, 3, 9, ASIENTO - 6, 'base'),
      caja(-ancho / 2 + 4, -fondo / 2 + RESPALDO, ASIENTO - 6, ancho / 2 - 4, fondo / 2 - 2, ASIENTO, 'tapizado', 3),
      extrusion('planta', curva, ASIENTO - 4, alto, 'tapizado'),
    ]
    if (valorVariante(sillaOficina, e, 'brazos')) {
      for (const x of [-ancho / 2, ancho / 2 - 4]) {
        piezas.push(tubo([[x + 2, 0, ASIENTO - 3], [x + 2, 0, BRAZOS - 3]], 1.2, 'base'), caja(x, -12, BRAZOS - 3, x + 4, 12, BRAZOS, 'tapizado', 1.5))
      }
    }
    return piezas
  },
  zonasApertura: () => [],
}
