import { valorVariante, type DefinicionTipo } from '../tipos'
import { ESPACIO_DE_USO_CM, espacioDelante, huellaEntera } from '../aperturas'
import { cajaMundo } from '../transformar'
import { caja, oscurecer, ovaloDeTaza, revolucion, tazaDeLoza } from '../modelos'

/** Alto de la taza con el asiento y fondo de la cisterna, en cm. */
const TAZA = 40
const CISTERNA = 18
const LOZA = '#f4f4f2'

export const inodoro: DefinicionTipo = {
  id: 'inodoro', nombre: 'inodoro', genero: 'm', categoria: 'mueble', estancias: ['bano'],
  medidas: { ancho: { min: 35, max: 45, defecto: 38 }, fondo: { min: 48, max: 75, defecto: 66 }, alto: { min: 70, max: 90, defecto: 78 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  // Con la cisterna empotrada solo queda la taza: el alto de las medidas (el de la cisterna) no cuenta.
  altoReal: (e) => (valorVariante(inodoro, e, 'cisterna') === true ? undefined : TAZA),
  variantes: [{ clave: 'cisterna', etiqueta: 'Cisterna vista', valores: [true, false], defecto: true }],
  zonasColor: [{ clave: 'loza', etiqueta: 'Loza', material: 'ceramica', defecto: LOZA }],
  // Su espacio de uso hace de paso: entre sanitarios no se avisa de pasos estrechos.
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes(e) {
    const { ancho, fondo, alto } = e.medidas
    const base = cajaMundo(e, -ancho / 2, -fondo / 2, ancho / 2, fondo / 2, 0, TAZA)
    if (valorVariante(inodoro, e, 'cisterna') !== true) return [base]
    return [base, cajaMundo(e, -ancho / 2, -fondo / 2, ancho / 2, -fondo / 2 + CISTERNA, TAZA, alto)]
  },
  planta: huellaEntera,
  // Taza ovalada de revolución con el borde a 38 y el aro del asiento encima; la cisterna, una caja redondeada sobre la taza.
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const cisterna = valorVariante(inodoro, e, 'cisterna') === true
    const borde = TAZA - 2
    // Con la cisterna vista, la taza empieza un poco por debajo de ella; empotrada, en la pared.
    const yAtras = cisterna ? -fondo / 2 + CISTERNA - 2 : -fondo / 2
    const { cy, rx, escalaY } = ovaloDeTaza(e, yAtras)
    return [
      ...tazaDeLoza(e, yAtras, borde, 'loza', oscurecer(e.colores.loza ?? LOZA, 0.85)),
      revolucion(0, cy, [[rx - 6, borde], [rx - 0.5, borde], [rx - 0.5, TAZA], [rx - 6, TAZA], [rx - 6, borde]], 'loza', { escalaY }),
      ...(cisterna ? [caja(-ancho / 2, -fondo / 2, TAZA, ancho / 2, -fondo / 2 + CISTERNA, alto, 'loza', 2)] : []),
    ]
  },
  zonasApertura: (e) => espacioDelante(e, 'el espacio de uso', ESPACIO_DE_USO_CM, Math.max(e.medidas.ancho, ESPACIO_DE_USO_CM)),
}
