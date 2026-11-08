import type { DefinicionTipo } from '../tipos'
import { cajaEntera, puertasAbatibles } from '../aperturas'
import { caja, frentes, yFrenteCuerpo } from '../modelos'

/** Separación entre baldas, en cm. */
const ENTRE_BALDAS = 35

const puertas = (ancho: number) => (ancho <= 60 ? 1 : 2)

export const vitrina: DefinicionTipo = {
  id: 'vitrina', nombre: 'vitrina', genero: 'f', categoria: 'mueble', estancias: ['salon'],
  medidas: { ancho: { min: 50, max: 120, defecto: 80 }, fondo: { min: 35, max: 45, defecto: 40 }, alto: { min: 160, max: 200, defecto: 180 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'madera', materiales: ['madera', 'lacado'], defecto: '#8b6b4a' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const y1 = yFrenteCuerpo(e, true)
    const baldas = Math.floor((alto - 10) / ENTRE_BALDAS)
    return [
      // Cuerpo hueco: costados, techo, suelo y fondo, para que se vean las baldas tras el cristal.
      caja(-ancho / 2, -fondo / 2, 0, -ancho / 2 + 2, y1, alto, 'cuerpo'),
      caja(ancho / 2 - 2, -fondo / 2, 0, ancho / 2, y1, alto, 'cuerpo'),
      caja(-ancho / 2 + 2, -fondo / 2, alto - 2, ancho / 2 - 2, y1, alto, 'cuerpo'),
      caja(-ancho / 2 + 2, -fondo / 2, 0, ancho / 2 - 2, y1, 8, 'cuerpo'),
      caja(-ancho / 2 + 2, -fondo / 2, 8, ancho / 2 - 2, -fondo / 2 + 1, alto - 2, 'cuerpo'),
      ...Array.from({ length: baldas }, (_, i) => caja(-ancho / 2 + 2, -fondo / 2 + 1, 8 + ENTRE_BALDAS * (i + 1), ancho / 2 - 2, y1, 10 + ENTRE_BALDAS * (i + 1), 'cuerpo')),
      ...frentes(e, puertas(ancho), 8, alto - 1, 'cuerpo').map((p) => ({ ...p, material: 'mampara' as const, color: '#dcebef' })),
    ]
  },
  zonasApertura: (e) => puertasAbatibles(e, puertas(e.medidas.ancho)),
}
