import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera, huellaOvalada } from '../aperturas'
import { caja, formaPatas, ovalo, patas4, revolucion, VARIANTE_PATAS } from '../modelos'

export const mesaAuxiliar: DefinicionTipo = {
  id: 'mesa-auxiliar', nombre: 'mesa auxiliar', genero: 'f', categoria: 'mueble', estancias: ['salon', 'dormitorio'],
  medidas: { ancho: { min: 35, max: 70, defecto: 50 }, fondo: { min: 35, max: 70, defecto: 50 }, alto: { min: 40, max: 65, defecto: 55 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [
    { clave: 'forma', etiqueta: 'Forma', valores: ['redonda', 'cuadrada'], defecto: 'redonda' },
    // Solo la cuadrada lleva cuatro patas; la redonda va sobre un pie.
    { ...VARIANTE_PATAS, valoresPara: (e) => (valorVariante(mesaAuxiliar, e, 'forma') === 'cuadrada' ? VARIANTE_PATAS.valores : ['cuadradas']), ocultarConUnValor: true },
  ],
  zonasColor: [{ clave: 'tablero', etiqueta: 'Tablero', material: 'madera', materiales: ['madera', 'lacado'], defecto: '#a98462' }, { clave: 'pie', etiqueta: 'Pie', material: 'metal', materiales: ['metal', 'madera', 'lacado'], defecto: '#3a3a3a' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: (e) => (valorVariante(mesaAuxiliar, e, 'forma') === 'redonda'
    ? [{ huella: huellaOvalada(e), zMin: e.alturaSuelo, zMax: e.alturaSuelo + e.medidas.alto }]
    : cajaEntera(e)),
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    if (valorVariante(mesaAuxiliar, e, 'forma') === 'cuadrada') {
      return [caja(-ancho / 2, -fondo / 2, alto - 3, ancho / 2, fondo / 2, alto, 'tablero'), ...patas4(e, 3, alto - 3, 'pie', 3, formaPatas(e))]
    }
    // Tablero redondo de una pieza sobre un pie de revolución: base achaflanada, caña que se estrecha y se abre bajo el tablero.
    const base = (Math.min(ancho, fondo) / 2) * 0.55
    const z = alto - 3
    return [...ovalo(e, z, alto, 'tablero'), revolucion(0, 0, [[0, 0], [base, 0], [base, 1.2], [base * 0.5, 2.5], [2.2, 6], [1.8, z - 4], [3, z], [0, z]], 'pie')]
  },
  zonasApertura: () => [],
}
