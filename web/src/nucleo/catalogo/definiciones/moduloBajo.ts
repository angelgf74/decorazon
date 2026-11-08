import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera, cajones, puertasAbatibles } from '../aperturas'
import { cajonesApilados, caja, desplazadasY, frentes, tiradores, yFrenteCuerpo } from '../modelos'

export const moduloBajo: DefinicionTipo = {
  id: 'modulo-bajo', nombre: 'módulo bajo', genero: 'm', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 15, max: 120, defecto: 60 }, fondo: { min: 45, max: 70, defecto: 60 }, alto: { min: 70, max: 95, defecto: 85 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'frente', etiqueta: 'Frente', valores: ['puertas', 'cajones'], defecto: 'puertas' }],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'lacado', materiales: ['lacado', 'madera'], defecto: '#f2efe8' }, { clave: 'encimera', etiqueta: 'Encimera', material: 'ceramica', defecto: '#cfc9bd' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const yCuerpo = yFrenteCuerpo(e, true) - 2
    const puertas = ancho <= 60 ? 1 : 2
    const frente = valorVariante(moduloBajo, e, 'frente') === 'cajones'
      ? cajonesApilados(e, 3, 9, alto - 5, 'cuerpo')
      : [...frentes(e, puertas, 9, alto - 5, 'cuerpo'), ...tiradores(e, puertas, (alto + 4) / 2 - 0.75, 'cuerpo')]
    return [
      caja(-ancho / 2 + 3, -fondo / 2 + 3, 0, ancho / 2 - 3, yCuerpo, 8, 'cuerpo'),
      caja(-ancho / 2, -fondo / 2, 8, ancho / 2, yCuerpo, alto - 4, 'cuerpo'),
      ...desplazadasY(frente, -2),
      caja(-ancho / 2, -fondo / 2, alto - 4, ancho / 2, fondo / 2, alto, 'encimera'),
    ]
  },
  zonasApertura: (e) => valorVariante(moduloBajo, e, 'frente') === 'cajones' ? cajones(e, e.medidas.fondo - 5) : puertasAbatibles(e, e.medidas.ancho <= 60 ? 1 : 2),
}
