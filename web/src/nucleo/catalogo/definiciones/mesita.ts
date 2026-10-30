import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera, cajones } from '../aperturas'
import { caja, cajonesApilados, yFrenteCuerpo } from '../modelos'

export const mesita: DefinicionTipo = {
  id: 'mesita', nombre: 'mesita', genero: 'f', categoria: 'mueble', estancias: ['dormitorio'],
  medidas: { ancho: { min: 30, max: 70, defecto: 45 }, fondo: { min: 30, max: 50, defecto: 40 }, alto: { min: 40, max: 75, defecto: 55 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'cajon', etiqueta: 'Cajón', valores: [true, false], defecto: true }],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'madera', defecto: '#a98462' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const cajon = valorVariante(mesita, e, 'cajon') === true
    return [
      caja(-ancho / 2, -fondo / 2, 0, ancho / 2, yFrenteCuerpo(e, cajon), alto, 'cuerpo'),
      ...(cajon ? cajonesApilados(e, 1, alto - 20, alto - 2, 'cuerpo') : []),
    ]
  },
  zonasApertura: (e) => valorVariante(mesita, e, 'cajon') === true ? cajones(e, e.medidas.fondo - 5) : [],
}
