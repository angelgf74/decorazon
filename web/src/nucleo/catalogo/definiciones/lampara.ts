import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { cilindro, revolucion, tubo } from '../modelos'

/** Alto de la peana y de la pantalla, grueso de la tela y lo que se estrecha la pantalla arriba (radio de arriba / radio de abajo). */
const PEANA = 3
const PANTALLA = 30
const TELA = 0.6
const ESTRECHA = 0.72

export const lampara: DefinicionTipo = {
  id: 'lampara-pie', nombre: 'lámpara de pie', genero: 'f', categoria: 'decoracion', estancias: ['dormitorio', 'salon', 'cocina', 'despacho', 'bano'],
  medidas: { ancho: { min: 25, max: 60, defecto: 40 }, fondo: { min: 25, max: 60, defecto: 40 }, alto: { min: 120, max: 200, defecto: 160 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'pantalla', etiqueta: 'Pantalla', material: 'tela', defecto: '#efe6d6' }, { clave: 'pie', etiqueta: 'Pie', material: 'metal', defecto: '#3a3a3a' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const lado = Math.min(ancho, fondo)
    const peana = lado * 0.35
    const abajo = lado / 2
    const arriba = abajo * ESTRECHA
    const z0 = alto - PANTALLA
    // La cruceta va 1 cm bajo el borde, de lado a lado por dentro de la tela.
    const cruceta = arriba - TELA
    return [
      // Peana con el canto achaflanado.
      revolucion(0, 0, [[0, 0], [peana, 0], [peana, PEANA / 2], [peana - PEANA / 2, PEANA], [0, PEANA]], 'pie'),
      cilindro(0, 0, 1.2, PEANA, alto - 1, 'pie'),
      tubo([[-cruceta, 0, alto - 1], [cruceta, 0, alto - 1]], 0.4, 'pie'),
      tubo([[0, -cruceta, alto - 1], [0, cruceta, alto - 1]], 0.4, 'pie'),
      // Pantalla hueca: sube por fuera, cruza el borde de arriba y baja por dentro; vuelve al primer punto para cerrar la pared.
      revolucion(0, 0, [[abajo - TELA, z0], [abajo, z0], [arriba, alto], [arriba - TELA, alto], [abajo - TELA, z0]], 'pantalla'),
    ]
  },
  zonasApertura: () => [],
}
