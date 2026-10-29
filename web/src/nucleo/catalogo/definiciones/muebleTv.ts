import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera, puertasAbatibles } from '../aperturas'
import { caja, frentes, tiradores, yFrenteCuerpo } from '../modelos'

export const muebleTv: DefinicionTipo = {
  id: 'mueble-tv', nombre: 'mueble de TV', genero: 'm', categoria: 'mueble', estancias: ['salon'],
  medidas: { ancho: { min: 80, max: 300, defecto: 160 }, fondo: { min: 30, max: 55, defecto: 40 }, alto: { min: 30, max: 80, defecto: 50 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'puertas', etiqueta: 'Puertas', valores: [0, 2, 4], defecto: 2 }],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'lacado', defecto: '#e8e4dc' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const puertas = Number(valorVariante(muebleTv, e, 'puertas'))
    return [
      caja(-ancho / 2 + 3, -fondo / 2 + 3, 0, ancho / 2 - 3, yFrenteCuerpo(e, true), 8, 'cuerpo'),
      caja(-ancho / 2, -fondo / 2, 8, ancho / 2, yFrenteCuerpo(e, puertas > 0), alto, 'cuerpo'),
      ...frentes(e, puertas, 9, alto - 1, 'cuerpo'),
      ...tiradores(e, puertas, (alto + 8) / 2 - 0.75, 'cuerpo'),
    ]
  },
  zonasApertura(e) {
    const puertas = Number(valorVariante(muebleTv, e, 'puertas'))
    return puertas > 0 ? puertasAbatibles(e, puertas) : []
  },
}
