import type { DefinicionTipo } from '../tipos'
import { cajaEntera, puertasAbatibles } from '../aperturas'
import { caja, frentes, tiradores, yFrenteCuerpo } from '../modelos'

export const moduloAlto: DefinicionTipo = {
  id: 'modulo-alto', nombre: 'módulo alto', genero: 'm', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 15, max: 120, defecto: 60 }, fondo: { min: 25, max: 45, defecto: 35 }, alto: { min: 30, max: 110, defecto: 70 } },
  alturaSuelo: 145, alturaSueloEditable: true,
  variantes: [],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'lacado', materiales: ['lacado', 'madera'], defecto: '#f2efe8' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const n = ancho <= 60 ? 1 : 2
    return [
      caja(-ancho / 2, -fondo / 2, 0, ancho / 2, yFrenteCuerpo(e, true), alto, 'cuerpo'),
      ...frentes(e, n, 1, alto - 1, 'cuerpo'),
      ...tiradores(e, n, 4, 'cuerpo'),
    ]
  },
  zonasApertura: (e) => puertasAbatibles(e, e.medidas.ancho <= 60 ? 1 : 2),
}
