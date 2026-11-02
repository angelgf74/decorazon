import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera, espacioDelante } from '../aperturas'
import { caja } from '../modelos'

/** Lo que se deja libre delante de una chimenea de leña, en cm: chispas y calor. */
export const ZONA_SEGURIDAD_CHIMENEA_CM = 80

export const chimenea: DefinicionTipo = {
  id: 'chimenea', nombre: 'chimenea', genero: 'f', categoria: 'mueble', estancias: ['salon'],
  medidas: { ancho: { min: 80, max: 180, defecto: 120 }, fondo: { min: 25, max: 60, defecto: 40 }, alto: { min: 60, max: 120, defecto: 100 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'tipo', etiqueta: 'Tipo', valores: ['leña', 'eléctrica'], defecto: 'leña' }],
  zonasColor: [{ clave: 'marco', etiqueta: 'Marco', material: 'ceramica', defecto: '#d9d4c7' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const marco = Math.min(15, ancho / 5)
    const hogar = Math.min(alto * 0.6, 70)
    return [
      // Marco alrededor del hogar, repisa arriba y el hueco oscuro.
      caja(-ancho / 2, -fondo / 2, 0, -ancho / 2 + marco, fondo / 2 - 2, alto - 5, 'marco'),
      caja(ancho / 2 - marco, -fondo / 2, 0, ancho / 2, fondo / 2 - 2, alto - 5, 'marco'),
      caja(-ancho / 2 + marco, -fondo / 2, 10 + hogar, ancho / 2 - marco, fondo / 2 - 2, alto - 5, 'marco'),
      caja(-ancho / 2 + marco, -fondo / 2, 0, ancho / 2 - marco, fondo / 2 - 2, 10, 'marco'),
      { ...caja(-ancho / 2 + marco, -fondo / 2, 10, ancho / 2 - marco, fondo / 2 - 6, 10 + hogar, 'marco'), material: 'vidrio', color: '#2a2522' },
      caja(-ancho / 2, -fondo / 2, alto - 5, ancho / 2, fondo / 2, alto, 'marco'),
    ]
  },
  // La eléctrica no echa chispas: sin zona de seguridad.
  zonasApertura: (e) => (valorVariante(chimenea, e, 'tipo') === 'leña'
    ? espacioDelante(e, 'la zona de seguridad', ZONA_SEGURIDAD_CHIMENEA_CM)
    : []),
}
