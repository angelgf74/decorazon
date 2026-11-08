import type { DefinicionTipo } from '../tipos'
import { huellaEntera, tableroConPatas } from '../aperturas'
import { mesaConPatas, VARIANTE_PATAS } from '../modelos'

export const mesaAlta: DefinicionTipo = {
  id: 'mesa-alta', nombre: 'mesa alta', genero: 'f', categoria: 'mueble', estancias: ['cocina', 'salon'],
  medidas: { ancho: { min: 80, max: 180, defecto: 120 }, fondo: { min: 40, max: 80, defecto: 60 }, alto: { min: 100, max: 115, defecto: 105 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [VARIANTE_PATAS],
  zonasColor: [{ clave: 'tablero', etiqueta: 'Tablero', material: 'madera', defecto: '#a98462' }, { clave: 'patas', etiqueta: 'Patas', material: 'metal', materiales: ['metal', 'madera', 'lacado'], defecto: '#3a3a3a' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  // Como la mesa: los taburetes caben debajo del tablero.
  volumenes: tableroConPatas,
  planta: huellaEntera,
  modelo3d: (e) => mesaConPatas(e, 'tablero', 'patas'),
  zonasApertura: () => [],
}
