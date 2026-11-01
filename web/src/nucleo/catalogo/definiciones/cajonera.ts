import type { DefinicionTipo } from '../tipos'
import { cajaEntera, cajones } from '../aperturas'
import { caja, cajonesApilados, cilindro, yFrenteCuerpo } from '../modelos'

/** Alto de las ruedas, en cm. */
const RUEDAS = 5

export const cajonera: DefinicionTipo = {
  id: 'cajonera', nombre: 'cajonera', genero: 'f', categoria: 'mueble', estancias: ['despacho'],
  medidas: { ancho: { min: 35, max: 50, defecto: 42 }, fondo: { min: 45, max: 65, defecto: 55 }, alto: { min: 50, max: 70, defecto: 60 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'lacado', defecto: '#e8e6e1' }, { clave: 'ruedas', etiqueta: 'Ruedas', material: 'metal', defecto: '#2b2b2b' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const xs = [-ancho / 2 + 4, ancho / 2 - 4]
    const ys = [-fondo / 2 + 4, fondo / 2 - 6]
    return [
      ...xs.flatMap((x) => ys.map((y) => cilindro(x, y, 2.5, 0, RUEDAS, 'ruedas'))),
      caja(-ancho / 2, -fondo / 2, RUEDAS, ancho / 2, yFrenteCuerpo(e, true), alto, 'cuerpo'),
      ...cajonesApilados(e, 3, RUEDAS + 1, alto - 1, 'cuerpo'),
    ]
  },
  zonasApertura: (e) => cajones(e, e.medidas.fondo - 5, RUEDAS),
}
