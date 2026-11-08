import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { caja, cilindro } from '../modelos'

export const perchero: DefinicionTipo = {
  id: 'perchero', nombre: 'perchero', genero: 'm', categoria: 'mueble', estancias: ['dormitorio', 'salon', 'despacho'],
  medidas: { ancho: { min: 35, max: 60, defecto: 45 }, fondo: { min: 35, max: 60, defecto: 45 }, alto: { min: 150, max: 200, defecto: 175 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'madera', defecto: '#7a5a3e' }],
  // De pie y delgado, como la lámpara: se pasa a su lado.
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const lado = Math.min(ancho, fondo)
    const brazo = lado / 2 - 2
    return [
      cilindro(0, 0, lado * 0.4, 0, 3, 'cuerpo'),
      cilindro(0, 0, 2, 3, alto, 'cuerpo'),
      // Colgadores en cruz cerca de arriba.
      caja(-brazo, -1, alto - 20, brazo, 1, alto - 17, 'cuerpo'),
      caja(-1, -brazo, alto - 26, 1, brazo, alto - 23, 'cuerpo'),
    ]
  },
  zonasApertura: () => [],
}
