import { valorVariante, type DefinicionTipo, type ZonaApertura } from '../tipos'
import { aMundo, cajaMundo } from '../transformar'
import { sectorCircunscrito } from '../../geometria/formas'

export const armario: DefinicionTipo = {
  id: 'armario', nombre: 'armario', genero: 'm', estancias: ['dormitorio'],
  medidas: { ancho: { min: 40, max: 400, defecto: 100 }, fondo: { min: 35, max: 70, defecto: 60 }, alto: { min: 60, max: 260, defecto: 220 } },
  alturaSuelo: 0,
  variantes: [
    { clave: 'puertas', etiqueta: 'Puertas', valores: ['abatibles', 'correderas'], defecto: 'abatibles' },
    { clave: 'modulos', etiqueta: 'Módulos', valores: [1, 2, 3, 4], defecto: 1 },
  ],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'lacado', defecto: '#e8e4dc' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes(e) {
    const { ancho, fondo, alto } = e.medidas
    return [cajaMundo(e, -ancho / 2, -fondo / 2, ancho / 2, fondo / 2, 0, alto)]
  },
  zonasApertura(e) {
    const puertas = valorVariante(armario, e, 'puertas')
    if (puertas !== 'abatibles') return []
    // valorVariante garantiza uno de los valores numéricos de la definición (1–4).
    const modulos = Number(valorVariante(armario, e, 'modulos'))
    const { ancho, fondo, alto } = e.medidas
    const n = 2 * modulos
    const w = ancho / n
    const zonas: ZonaApertura[] = []
    for (let k = 0; k < n; k++) {
      const izq = -ancho / 2 + k * w
      const par = k % 2 === 0
      const bisagra = { x: par ? izq : izq + w, y: fondo / 2 }
      const sector = par ? sectorCircunscrito(bisagra, w, 0, 90) : sectorCircunscrito(bisagra, w, 90, 180)
      zonas.push({
        nombre: 'la puerta',
        huella: sector.map((p) => aMundo(e, p)),
        zMin: e.alturaSuelo,
        zMax: e.alturaSuelo + alto,
      })
    }
    return zonas
  },
}
