import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaMundo } from '../transformar'
import { caja, patas4 } from '../modelos'

/** Lo que la ropa de cama (almohadas de 10, edredón de 6) sube sobre el colchón, y el hueco entre almohadas y hasta los bordes. */
const ROPA = 10
const HUECO = 5

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
  // Patas y somier (si el alto lo permite), colchón hasta 10 cm bajo el alto, y encima las almohadas y el edredón hasta el alto.
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const cabecero = valorVariante(cama, e, 'cabecero') === true
    const y0 = cabecero ? -fondo / 2 + 6 : -fondo / 2
    const tope = alto - ROPA
    const zColchon = Math.max(alto - 22, 0)
    const zSomier = Math.max(zColchon - 8, 0)
    const n = ancho >= 120 ? 2 : 1
    const wAlmohada = Math.min(80, (ancho - HUECO * (n + 1)) / n)
    const xAlmohada = -(n * wAlmohada + (n - 1) * HUECO) / 2
    return [
      ...(zSomier > 0 ? patas4(e, 6, zSomier, 'estructura', 2) : []),
      ...(zColchon > 0 ? [caja(-ancho / 2, y0, zSomier, ancho / 2, fondo / 2, zColchon, 'estructura')] : []),
      caja(-ancho / 2, y0, zColchon, ancho / 2, fondo / 2, tope, 'ropa', 2),
      ...Array.from({ length: n }, (_, i) => {
        const x0 = xAlmohada + i * (wAlmohada + HUECO)
        return caja(x0, y0 + HUECO, tope, x0 + wAlmohada, y0 + HUECO + 40, alto, 'ropa', 4)
      }),
      caja(-ancho / 2, y0 + 50, tope, ancho / 2, fondo / 2, tope + 6, 'ropa', 3),
      ...(cabecero ? [caja(-ancho / 2, -fondo / 2, 0, ancho / 2, -fondo / 2 + 6, 100, 'estructura')] : []),
    ]
  },
  zonasApertura: () => [],
}
