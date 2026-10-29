import type { DefinicionTipo } from '../tipos'
import { cajaEntera, puertaAbatibleAbajo } from '../aperturas'
import { caja, frentes, tiradores, yFrenteCuerpo } from '../modelos'

export const lavavajillas: DefinicionTipo = {
  id: 'lavavajillas', nombre: 'lavavajillas', genero: 'm', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 45, max: 60, defecto: 60 }, fondo: { min: 55, max: 65, defecto: 60 }, alto: { min: 80, max: 90, defecto: 85 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'frente', etiqueta: 'Frente', material: 'metal', defecto: '#d9dadb' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    return [
      caja(-ancho / 2 + 3, -fondo / 2 + 3, 0, ancho / 2 - 3, yFrenteCuerpo(e, true), 8, 'frente'),
      caja(-ancho / 2, -fondo / 2, 8, ancho / 2, yFrenteCuerpo(e, true), alto, 'frente'),
      ...frentes(e, 1, 9, alto - 1, 'frente'),
      ...tiradores(e, 1, alto - 8, 'frente'),
    ]
  },
  zonasApertura: (e) => puertaAbatibleAbajo(e, e.medidas.alto - 15, 10),
}
