import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { cajaMundo } from '../transformar'
import { asientoTapizado, type LadoChaise } from '../modelos'

export const sofa: DefinicionTipo = {
  id: 'sofa', nombre: 'sofá', genero: 'm', categoria: 'mueble', estancias: ['salon'],
  medidas: { ancho: { min: 140, max: 320, defecto: 200 }, fondo: { min: 80, max: 110, defecto: 90 }, alto: { min: 70, max: 100, defecto: 85 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [
    { clave: 'plazas', etiqueta: 'Plazas', valores: [2, 3], defecto: 3 },
    { clave: 'chaise', etiqueta: 'Chaise longue', valores: ['no', 'izquierda', 'derecha'], defecto: 'no' },
  ],
  zonasColor: [
    { clave: 'tapizado', etiqueta: 'Tapizado', material: 'tela', defecto: '#7d8a7a' },
    { clave: 'patas', etiqueta: 'Patas', material: 'madera', materiales: ['madera', 'metal', 'lacado'], defecto: '#5b4636' },
  ],
  pisable: false, bloqueaPaso: true, conjunto: 'estar', sobreVentana: false,
  volumenes(e) {
    const chaise = valorVariante(sofa, e, 'chaise')
    if (chaise === 'no') return cajaEntera(e)
    const { ancho, fondo, alto } = e.medidas
    const w = Math.min(90, ancho / 2)
    const [x0, x1] = chaise === 'izquierda' ? [-ancho / 2, -ancho / 2 + w] : [ancho / 2 - w, ancho / 2]
    return [...cajaEntera(e), cajaMundo(e, x0, -fondo / 2, x1, fondo / 2 + 70, 0, alto - 40)]
  },
  modelo3d: (e) => asientoTapizado(e, Number(valorVariante(sofa, e, 'plazas')), valorVariante(sofa, e, 'chaise') as LadoChaise),
  zonasApertura: () => [],
}
