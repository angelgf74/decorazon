import type { DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { caja } from '../modelos'

/** Barrotes de 2 cm cada 10 cm, como mucho 12 por lado: más no se distinguen y cuestan piezas. */
const MAXIMO_BARROTES = 12

export const cuna: DefinicionTipo = {
  id: 'cuna', nombre: 'cuna', genero: 'f', categoria: 'mueble', estancias: ['dormitorio'],
  medidas: { ancho: { min: 110, max: 150, defecto: 126 }, fondo: { min: 60, max: 80, defecto: 66 }, alto: { min: 80, max: 110, defecto: 95 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [],
  zonasColor: [
    { clave: 'estructura', etiqueta: 'Estructura', material: 'madera', materiales: ['madera', 'lacado', 'metal'], defecto: '#efe8dc' },
    { clave: 'colchon', etiqueta: 'Colchón', material: 'tela', defecto: '#f4f1ea' },
  ],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const poste = 4
    const zColchon = 25
    const n = Math.min(MAXIMO_BARROTES, Math.floor((ancho - 2 * poste) / 10))
    const paso = (ancho - 2 * poste) / (n + 1)
    const barrotes = (y0: number, y1: number) =>
      Array.from({ length: n }, (_, i) => {
        const x = -ancho / 2 + poste + paso * (i + 1)
        return caja(x - 1, y0, zColchon, x + 1, y1, alto - 4, 'estructura')
      })
    const postes = [-ancho / 2, ancho / 2 - poste].flatMap((x) => [-fondo / 2, fondo / 2 - poste].map((y) => caja(x, y, 0, x + poste, y + poste, alto, 'estructura')))
    return [
      ...postes,
      caja(-ancho / 2 + poste, -fondo / 2 + poste, zColchon - 4, ancho / 2 - poste, fondo / 2 - poste, zColchon, 'estructura'),
      caja(-ancho / 2 + poste, -fondo / 2 + poste, zColchon, ancho / 2 - poste, fondo / 2 - poste, zColchon + 10, 'colchon'),
      // Barandillas de arriba en los lados largos y lados cortos cerrados.
      caja(-ancho / 2 + poste, -fondo / 2, alto - 4, ancho / 2 - poste, -fondo / 2 + 2, alto, 'estructura'),
      caja(-ancho / 2 + poste, fondo / 2 - 2, alto - 4, ancho / 2 - poste, fondo / 2, alto, 'estructura'),
      caja(-ancho / 2, -fondo / 2 + poste, zColchon, -ancho / 2 + 2, fondo / 2 - poste, alto, 'estructura'),
      caja(ancho / 2 - 2, -fondo / 2 + poste, zColchon, ancho / 2, fondo / 2 - poste, alto, 'estructura'),
      ...barrotes(-fondo / 2, -fondo / 2 + 2),
      ...barrotes(fondo / 2 - 2, fondo / 2),
    ]
  },
  zonasApertura: () => [],
}
