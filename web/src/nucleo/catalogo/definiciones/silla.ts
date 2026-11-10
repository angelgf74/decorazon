import type { DefinicionTipo } from '../tipos'
import { asientoYRespaldo, huellaEntera } from '../aperturas'
import { caja, extrusion, formaPatas, patas4, VARIANTE_PATAS } from '../modelos'

/** Fondo del respaldo (el de su volumen), grueso del panel, lo que se curva y alto de los faldones bajo el asiento, en cm. */
const RESPALDO = 3
const PANEL = 1.5
const CURVA = RESPALDO - PANEL
const FALDON = 7

export const silla: DefinicionTipo = {
  id: 'silla', nombre: 'silla', genero: 'f', categoria: 'mueble', estancias: ['dormitorio', 'salon', 'cocina', 'despacho'],
  medidas: { ancho: { min: 40, max: 60, defecto: 45 }, fondo: { min: 40, max: 60, defecto: 50 }, alto: { min: 75, max: 110, defecto: 85 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [VARIANTE_PATAS],
  zonasColor: [{ clave: 'asiento', etiqueta: 'Asiento', material: 'madera', materiales: ['madera', 'lacado', 'metal'], defecto: '#8b6b4a' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: (e) => asientoYRespaldo(e, 45, RESPALDO),
  planta: huellaEntera,
  // Asiento a 45 con el canto redondeado y faldones debajo que unen las patas; el respaldo son dos montantes de 4 × 3 y un panel
  // de 22 cm que flota sobre el asiento, curvado hacia atrás en el centro (cabe en los 3 cm del volumen del respaldo).
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const yRespaldo = -fondo / 2 + RESPALDO
    // Las patas son de 4 metidas 2: los faldones van de pata a pata por su cara de fuera.
    const xPata = ancho / 2 - 6
    const yPata = fondo / 2 - 6
    const w = ancho / 2 - 4
    const xs = Array.from({ length: 9 }, (_, i) => -w + (2 * w * i) / 8)
    const atras = (x: number) => -fondo / 2 + CURVA * (x / w) ** 2
    const curva: [number, number][] = [...xs.map((x): [number, number] => [x, atras(x)]), ...[...xs].reverse().map((x): [number, number] => [x, atras(x) + PANEL])]
    return [
      ...patas4(e, 4, 42, 'asiento', 2, formaPatas(e)),
      caja(-ancho / 2, -fondo / 2, 42, ancho / 2, fondo / 2, 45, 'asiento', 1),
      caja(-xPata, -fondo / 2 + 2, 42 - FALDON, xPata, -fondo / 2 + 4, 42, 'asiento'),
      caja(-xPata, fondo / 2 - 4, 42 - FALDON, xPata, fondo / 2 - 2, 42, 'asiento'),
      caja(-ancho / 2 + 2, -yPata, 42 - FALDON, -ancho / 2 + 4, yPata, 42, 'asiento'),
      caja(ancho / 2 - 4, -yPata, 42 - FALDON, ancho / 2 - 2, yPata, 42, 'asiento'),
      caja(-ancho / 2, -fondo / 2, 45, -ancho / 2 + 4, yRespaldo, alto, 'asiento'),
      caja(ancho / 2 - 4, -fondo / 2, 45, ancho / 2, yRespaldo, alto, 'asiento'),
      extrusion('planta', curva, alto - 25, alto - 3, 'asiento'),
    ]
  },
  zonasApertura: () => [],
}
