import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera, huellaOvalada } from '../aperturas'
import { caja, RADIO_COJIN, revolucion } from '../modelos'

export const puf: DefinicionTipo = {
  id: 'puf', nombre: 'puf', genero: 'm', categoria: 'mueble', estancias: ['salon', 'dormitorio'],
  medidas: { ancho: { min: 35, max: 70, defecto: 45 }, fondo: { min: 35, max: 70, defecto: 45 }, alto: { min: 30, max: 45, defecto: 40 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'forma', etiqueta: 'Forma', valores: ['redonda', 'cuadrada'], defecto: 'redonda' }],
  zonasColor: [{ clave: 'tapizado', etiqueta: 'Tapizado', material: 'tela', defecto: '#b9714f' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: (e) => (valorVariante(puf, e, 'forma') === 'redonda'
    ? [{ huella: huellaOvalada(e), zMin: e.alturaSuelo, zMax: e.alturaSuelo + e.medidas.alto }]
    : cajaEntera(e)),
  // Redondo: revolución abombada (la más ancha a media altura), ovalada si no es redondo. Cuadrado: caja con aristas de cojín.
  modelo3d(e) {
    const { ancho, fondo, alto: h } = e.medidas
    if (valorVariante(puf, e, 'forma') !== 'redonda') return [caja(-ancho / 2, -fondo / 2, 0, ancho / 2, fondo / 2, h, 'tapizado', RADIO_COJIN)]
    const r = ancho / 2
    return [revolucion(0, 0, [[0, 0], [r * 0.86, 0], [r * 0.97, h * 0.18], [r, h * 0.5], [r * 0.97, h * 0.82], [r * 0.86, h], [0, h]], 'tapizado', { escalaY: fondo / ancho })]
  },
  zonasApertura: () => [],
}
