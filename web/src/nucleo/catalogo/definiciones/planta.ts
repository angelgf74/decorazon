import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { cilindro } from '../modelos'

export const planta: DefinicionTipo = {
  id: 'planta', nombre: 'planta', genero: 'f', categoria: 'decoracion', estancias: ['dormitorio', 'salon', 'cocina', 'despacho', 'bano'],
  medidas: { ancho: { min: 20, max: 100, defecto: 40 }, fondo: { min: 20, max: 100, defecto: 40 }, alto: { min: 30, max: 200, defecto: 100 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'maceta', etiqueta: 'Maceta', material: 'ceramica', defecto: '#b9714f' }, { clave: 'hojas', etiqueta: 'Hojas', material: 'tela', defecto: '#5f7f4f' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const lado = Math.min(ancho, fondo)
    const maceta = alto * 0.25
    const tramo = (alto - maceta) / 3
    return [
      cilindro(0, 0, lado * 0.3, 0, maceta, 'maceta'),
      ...[0.5, 0.38, 0.25].map((k, i) => cilindro(0, 0, lado * k, maceta + i * tramo, maceta + (i + 1) * tramo, 'hojas')),
    ]
  },
  zonasApertura: () => [],
}
