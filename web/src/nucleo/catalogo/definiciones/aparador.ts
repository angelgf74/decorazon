import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera, puertasAbatibles } from '../aperturas'
import { caja, frentes, tiradores, yFrenteCuerpo } from '../modelos'

export const aparador: DefinicionTipo = {
  id: 'aparador', nombre: 'aparador', genero: 'm', categoria: 'mueble', estancias: ['salon'],
  medidas: { ancho: { min: 80, max: 240, defecto: 160 }, fondo: { min: 35, max: 55, defecto: 45 }, alto: { min: 60, max: 110, defecto: 80 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'puertas', etiqueta: 'Puertas', valores: [2, 3, 4], defecto: 2 }],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'madera', defecto: '#8b6b4a' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const puertas = Number(valorVariante(aparador, e, 'puertas'))
    return [
      caja(-ancho / 2 + 3, -fondo / 2 + 3, 0, ancho / 2 - 3, yFrenteCuerpo(e, true), 8, 'cuerpo'),
      caja(-ancho / 2, -fondo / 2, 8, ancho / 2, yFrenteCuerpo(e, puertas > 0), alto, 'cuerpo'),
      ...frentes(e, puertas, 9, alto - 1, 'cuerpo'),
      ...tiradores(e, puertas, (alto + 8) / 2 - 0.75, 'cuerpo'),
    ]
  },
  zonasApertura: (e) => puertasAbatibles(e, Number(valorVariante(aparador, e, 'puertas'))),
}
