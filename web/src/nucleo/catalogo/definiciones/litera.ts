import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera } from '../aperturas'
import { caja } from '../modelos'

export const litera: DefinicionTipo = {
  id: 'litera', nombre: 'litera', genero: 'f', categoria: 'mueble', estancias: ['dormitorio'],
  medidas: { ancho: { min: 90, max: 110, defecto: 97 }, fondo: { min: 190, max: 210, defecto: 200 }, alto: { min: 150, max: 180, defecto: 160 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  // Lado largo por el que se sube (x): «Voltear» la cambia de lado.
  variantes: [{ clave: 'escalera', etiqueta: 'Escalera', valores: ['izquierda', 'derecha'], defecto: 'derecha' }],
  zonasColor: [
    { clave: 'estructura', etiqueta: 'Estructura', material: 'madera', materiales: ['madera', 'lacado', 'metal'], defecto: '#d8c3a0' },
    { clave: 'ropa', etiqueta: 'Ropa de cama', material: 'tela', defecto: '#c9d3dc' },
  ],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    // Lo largo va en y (fondo), como una cama. La escalera, de 35 cm, en el lado largo elegido, junto a los pies (y positiva).
    const { ancho, fondo, alto } = e.medidas
    const poste = 6
    const zArriba = alto - 50
    const izquierda = valorVariante(litera, e, 'escalera') === 'izquierda'
    const xEscalera = izquierda ? -ancho / 2 : ancho / 2 - 3
    const xBarandilla = izquierda ? ancho / 2 - 3 : -ancho / 2
    const peldanos = Math.floor((zArriba + 10) / 30)
    const cama = (z: number) => [
      caja(-ancho / 2 + poste, -fondo / 2 + poste, z, ancho / 2 - poste, fondo / 2 - poste, z + 10, 'estructura'),
      caja(-ancho / 2 + poste, -fondo / 2 + poste, z + 10, ancho / 2 - poste, fondo / 2 - poste, z + 25, 'ropa'),
    ]
    const postes = [-ancho / 2, ancho / 2 - poste].flatMap((x) => [-fondo / 2, fondo / 2 - poste].map((y) => caja(x, y, 0, x + poste, y + poste, alto, 'estructura')))
    return [
      ...postes,
      ...cama(15),
      ...cama(zArriba - 25),
      // Barandilla arriba en el lado largo sin escalera, y cabeceros arriba.
      caja(xBarandilla, -fondo / 2 + poste, zArriba, xBarandilla + 3, fondo / 2 - poste, alto - 2, 'estructura'),
      caja(-ancho / 2 + poste, -fondo / 2, zArriba, ancho / 2 - poste, -fondo / 2 + 3, alto - 2, 'estructura'),
      caja(-ancho / 2 + poste, fondo / 2 - 3, zArriba, ancho / 2 - poste, fondo / 2, alto - 2, 'estructura'),
      ...Array.from({ length: peldanos }, (_, i) => caja(xEscalera, fondo / 2 - poste - 35, 30 * (i + 1) - 3, xEscalera + 3, fondo / 2 - poste, 30 * (i + 1), 'estructura')),
    ]
  },
  zonasApertura: () => [],
}
