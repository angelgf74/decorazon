import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaMundo } from '../transformar'
import { caja, patas4 } from '../modelos'

export const cama: DefinicionTipo = {
  id: 'cama', nombre: 'cama', genero: 'f', categoria: 'mueble', estancias: ['dormitorio'],
  medidas: { ancho: { min: 80, max: 220, defecto: 150 }, fondo: { min: 180, max: 220, defecto: 200 }, alto: { min: 20, max: 70, defecto: 45 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'cabecero', etiqueta: 'Cabecero', valores: [true, false], defecto: true }],
  zonasColor: [
    { clave: 'estructura', etiqueta: 'Estructura', material: 'madera', defecto: '#8b6b4a' },
    { clave: 'ropa', etiqueta: 'Ropa de cama', material: 'tela', defecto: '#d9d4c7' },
  ],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes(e) {
    const { ancho, fondo, alto } = e.medidas
    const base = cajaMundo(e, -ancho / 2, -fondo / 2, ancho / 2, fondo / 2, 0, alto)
    const cabecero = valorVariante(cama, e, 'cabecero') === true
    if (!cabecero) return [base]
    return [base, cajaMundo(e, -ancho / 2, -fondo / 2, ancho / 2, -fondo / 2 + 6, 0, 100)]
  },
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const cabecero = valorVariante(cama, e, 'cabecero') === true
    const y0 = cabecero ? -fondo / 2 + 6 : -fondo / 2
    const zColchon = Math.max(alto - 22, 0)
    const zSomier = Math.max(zColchon - 8, 0)
    return [
      ...(zSomier > 0 ? patas4(e, 6, zSomier, 'estructura', 2) : []),
      caja(-ancho / 2, y0, zSomier, ancho / 2, fondo / 2, zColchon, 'estructura'),
      caja(-ancho / 2, y0, zColchon, ancho / 2, fondo / 2, alto, 'ropa'),
      ...(cabecero ? [caja(-ancho / 2, -fondo / 2, 0, ancho / 2, -fondo / 2 + 6, 100, 'estructura')] : []),
    ]
  },
  zonasApertura: () => [],
}
