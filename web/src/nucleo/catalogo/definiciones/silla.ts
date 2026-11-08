import type { DefinicionTipo } from '../tipos'
import { asientoYRespaldo, huellaEntera } from '../aperturas'
import { caja, formaPatas, patas4, VARIANTE_PATAS } from '../modelos'

export const silla: DefinicionTipo = {
  id: 'silla', nombre: 'silla', genero: 'f', categoria: 'mueble', estancias: ['dormitorio', 'salon', 'cocina', 'despacho'],
  medidas: { ancho: { min: 40, max: 60, defecto: 45 }, fondo: { min: 40, max: 60, defecto: 50 }, alto: { min: 75, max: 110, defecto: 85 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [VARIANTE_PATAS],
  zonasColor: [{ clave: 'asiento', etiqueta: 'Asiento', material: 'madera', defecto: '#8b6b4a' }],
  pisable: false, bloqueaPaso: false, sobreVentana: false,
  volumenes: (e) => asientoYRespaldo(e, 45, 3),
  planta: huellaEntera,
  // Asiento a 45 con el canto redondeado; el respaldo son dos montantes de 4 × 3 y un panel de 22 cm que flota sobre el asiento.
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const yRespaldo = -fondo / 2 + 3
    return [
      ...patas4(e, 4, 42, 'asiento', 2, formaPatas(e)),
      caja(-ancho / 2, -fondo / 2, 42, ancho / 2, fondo / 2, 45, 'asiento', 1),
      caja(-ancho / 2, -fondo / 2, 45, -ancho / 2 + 4, yRespaldo, alto, 'asiento'),
      caja(ancho / 2 - 4, -fondo / 2, 45, ancho / 2, yRespaldo, alto, 'asiento'),
      caja(-ancho / 2 + 4, -fondo / 2, alto - 25, ancho / 2 - 4, yRespaldo, alto - 3, 'asiento', 1),
    ]
  },
  zonasApertura: () => [],
}
