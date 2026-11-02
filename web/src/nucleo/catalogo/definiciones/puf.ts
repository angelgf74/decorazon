import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera, huellaOvalada } from '../aperturas'
import { caja, ovalo } from '../modelos'

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
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    return valorVariante(puf, e, 'forma') === 'redonda'
      ? ovalo(e, 0, alto, 'tapizado')
      : [caja(-ancho / 2, -fondo / 2, 0, ancho / 2, fondo / 2, alto, 'tapizado')]
  },
  zonasApertura: () => [],
}
