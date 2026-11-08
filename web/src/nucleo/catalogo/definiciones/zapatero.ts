import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { cajaMundo } from '../transformar'
import { caja, cajonesApilados, yFrenteCuerpo } from '../modelos'

/** Lo que sale hacia delante una trampilla abatible al abrirla. */
const RECORRIDO_CM = 20

export const zapatero: DefinicionTipo = {
  id: 'zapatero', nombre: 'zapatero', genero: 'm', categoria: 'mueble', estancias: ['dormitorio', 'salon'],
  medidas: { ancho: { min: 50, max: 140, defecto: 80 }, fondo: { min: 17, max: 40, defecto: 25 }, alto: { min: 50, max: 180, defecto: 110 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'trampillas', etiqueta: 'Trampillas', valores: [2, 3, 4], defecto: 3 }],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'lacado', materiales: ['lacado', 'madera'], defecto: '#f2efe9' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    return [
      caja(-ancho / 2, -fondo / 2, 0, ancho / 2, yFrenteCuerpo(e, true), alto, 'cuerpo'),
      ...cajonesApilados(e, valorVariante(zapatero, e, 'trampillas') as number, 1, alto - 1, 'cuerpo'),
    ]
  },
  zonasApertura(e) {
    const { ancho, fondo, alto } = e.medidas
    return [{ nombre: 'la trampilla', ...cajaMundo(e, -ancho / 2, fondo / 2, ancho / 2, fondo / 2 + RECORRIDO_CM, 0, alto) }]
  },
}
