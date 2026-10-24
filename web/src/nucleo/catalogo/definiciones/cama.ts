import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaMundo } from '../transformar'

export const cama: DefinicionTipo = {
  id: 'cama', nombre: 'cama', genero: 'f', estancias: ['dormitorio'],
  medidas: { ancho: { min: 80, max: 220, defecto: 150 }, fondo: { min: 180, max: 220, defecto: 200 }, alto: { min: 20, max: 70, defecto: 45 } },
  alturaSuelo: 0,
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
  zonasApertura: () => [],
}
