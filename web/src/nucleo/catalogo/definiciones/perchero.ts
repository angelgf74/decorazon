import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import type { PiezaLocal } from '../../modelo3d/tipos'
import { cilindro, revolucion, tubo } from '../modelos'
import { elipsoide } from '../perfiles'

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
    const peana = lado * 0.4
    // Cuatro ganchos en dos alturas que salen del poste, bajan un poco y suben con la punta curvada.
    const largo = lado / 2 - 5
    const ganchos = [0, 1, 2, 3].map((k): PiezaLocal => {
      const a = Math.PI / 4 + (k * Math.PI) / 2
      const [c, s] = [Math.cos(a), Math.sin(a)]
      const z = alto - (k % 2 === 0 ? 18 : 25)
      return tubo([[0, 0, z], [largo * c, largo * s, z - 3], [(largo + 2) * c, (largo + 2) * s, z + 5]], 0.8, 'cuerpo', { codo: 2 })
    })
    return [
      // Peana con el canto achaflanado, poste y remate.
      revolucion(0, 0, [[0, 0], [peana, 0], [peana, 1.5], [peana - 1.5, 3], [0, 3]], 'cuerpo'),
      cilindro(0, 0, 2, 3, alto - 5, 'cuerpo'),
      revolucion(0, 0, elipsoide(2.8, alto - 6, alto), 'cuerpo'),
      ...ganchos,
    ]
  },
  zonasApertura: () => [],
}
