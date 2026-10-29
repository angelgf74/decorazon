import type { DefinicionTipo } from '../tipos'
import { cajaEntera, puertasAbatibles } from '../aperturas'
import { caja, desplazadasY, frentes, yFrenteCuerpo } from '../modelos'

export const frigorifico: DefinicionTipo = {
  id: 'frigorifico', nombre: 'frigorífico', genero: 'm', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 50, max: 95, defecto: 60 }, fondo: { min: 55, max: 80, defecto: 65 }, alto: { min: 140, max: 210, defecto: 185 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'metal', defecto: '#d9dadb' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    // 2 cm por detrás, como el módulo bajo, para que los frentes de la hilera queden en un plano.
    return desplazadasY([
      caja(-ancho / 2, -fondo / 2 + 2, 0, ancho / 2, yFrenteCuerpo(e, true), alto, 'cuerpo'),
      ...frentes(e, 1, 1, alto - 1, 'cuerpo'),
      caja(ancho / 2 - 6, fondo / 2 - 1.5, alto / 2 - 20, ancho / 2 - 4.5, fondo / 2, alto / 2 + 20, 'cuerpo'),
    ], -2)
  },
  zonasApertura: (e) => puertasAbatibles(e, 1),
}
