import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { aMundo } from '../transformar'
import { sectorCircunscrito } from '../../geometria/formas'
import { caja } from '../modelos'

/** Lado de la puerta (redonda, aproximada por su cuadrado) y altura de su borde inferior, en cm. */
const PUERTA = 45
const Z_PUERTA = 30

export const lavadora: DefinicionTipo = {
  id: 'lavadora', nombre: 'lavadora', genero: 'f', categoria: 'mueble', estancias: ['bano', 'cocina'],
  medidas: { ancho: { min: 55, max: 60, defecto: 60 }, fondo: { min: 45, max: 65, defecto: 60 }, alto: { min: 82, max: 90, defecto: 85 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'lacado', defecto: '#f4f4f2' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    return [
      caja(-ancho / 2, -fondo / 2, 0, ancho / 2, fondo / 2 - 1, alto, 'cuerpo'),
      { ...caja(-ancho / 2 + 3, fondo / 2 - 1, alto - 12, ancho / 2 - 3, fondo / 2, alto - 3, 'cuerpo'), material: 'metal', color: '#b9bcbf' },
      { ...caja(-PUERTA / 2, fondo / 2 - 1, Z_PUERTA, PUERTA / 2, fondo / 2, Z_PUERTA + PUERTA, 'cuerpo'), material: 'vidrio', color: '#3a3f44' },
    ]
  },
  // La puerta abre hacia fuera con la bisagra a la izquierda.
  zonasApertura: (e) => [{
    nombre: 'la puerta',
    huella: sectorCircunscrito({ x: -PUERTA / 2, y: e.medidas.fondo / 2 }, PUERTA, 0, 90).map((p) => aMundo(e, p)),
    zMin: e.alturaSuelo + Z_PUERTA,
    zMax: e.alturaSuelo + Z_PUERTA + PUERTA,
  }],
}
