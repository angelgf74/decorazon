import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { cajaMundo } from '../transformar'
import { asientoTapizado, caja } from '../modelos'

/** Lo que sale la cama por delante al abrirla, y su alto. */
const SALIDA_CM = 110
const ALTO_CAMA_CM = 45

export const sofaCama: DefinicionTipo = {
  id: 'sofa-cama', nombre: 'sofá cama', genero: 'm', categoria: 'mueble', estancias: ['salon', 'despacho', 'dormitorio'],
  medidas: { ancho: { min: 140, max: 220, defecto: 180 }, fondo: { min: 85, max: 105, defecto: 95 }, alto: { min: 75, max: 100, defecto: 85 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  // Abierto se comprueba si la cama cabe: lo que haya delante (la mesa de centro) choca con ella.
  variantes: [{ clave: 'abierto', etiqueta: 'Abierto', valores: [false, true], defecto: false }],
  zonasColor: [
    { clave: 'tapizado', etiqueta: 'Tapizado', material: 'tela', defecto: '#8a8f99' },
    { clave: 'patas', etiqueta: 'Patas', material: 'madera', defecto: '#5b4636' },
    { clave: 'colchon', etiqueta: 'Colchón', material: 'tela', defecto: '#ece7dc' },
  ],
  pisable: false, bloqueaPaso: true, conjunto: 'estar', sobreVentana: false,
  volumenes(e) {
    if (valorVariante(sofaCama, e, 'abierto') !== true) return cajaEntera(e)
    const { ancho, fondo } = e.medidas
    return [...cajaEntera(e), cajaMundo(e, -ancho / 2 + 5, fondo / 2, ancho / 2 - 5, fondo / 2 + SALIDA_CM, 0, ALTO_CAMA_CM)]
  },
  modelo3d(e) {
    const { ancho, fondo } = e.medidas
    const sofa = asientoTapizado(e, ancho < 170 ? 2 : 3, 'no')
    if (valorVariante(sofaCama, e, 'abierto') !== true) return sofa
    const y1 = fondo / 2 + SALIDA_CM
    return [
      ...sofa,
      caja(-ancho / 2 + 5, fondo / 2, 25, ancho / 2 - 5, y1, ALTO_CAMA_CM - 12, 'patas'),
      caja(-ancho / 2 + 5, fondo / 2, ALTO_CAMA_CM - 12, ancho / 2 - 5, y1, ALTO_CAMA_CM, 'colchon'),
      ...[-ancho / 2 + 8, ancho / 2 - 13].map((x) => caja(x, y1 - 8, 0, x + 5, y1 - 3, 25, 'patas')),
    ]
  },
  zonasApertura: () => [],
}
