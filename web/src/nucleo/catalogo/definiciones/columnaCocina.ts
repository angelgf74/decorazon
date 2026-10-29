import { valorVariante, type DefinicionTipo } from '../tipos'
import { cajaEntera, puertaAbatibleAbajo, puertasAbatibles } from '../aperturas'
import { caja, frentes, tiradores, yFrenteCuerpo } from '../modelos'

export const columnaCocina: DefinicionTipo = {
  id: 'columna-cocina', nombre: 'columna de cocina', genero: 'f', categoria: 'mueble', estancias: ['cocina'],
  medidas: { ancho: { min: 45, max: 70, defecto: 60 }, fondo: { min: 55, max: 70, defecto: 60 }, alto: { min: 180, max: 240, defecto: 215 } },
  alturaSuelo: 0, alturaSueloEditable: false,
  variantes: [{ clave: 'integrado', etiqueta: 'Integrado', valores: ['horno', 'frigorifico'], defecto: 'horno' }],
  zonasColor: [{ clave: 'cuerpo', etiqueta: 'Cuerpo', material: 'lacado', defecto: '#f2efe8' }],
  pisable: false, bloqueaPaso: true, sobreVentana: false,
  volumenes: cajaEntera,
  modelo3d(e) {
    const { ancho, fondo, alto } = e.medidas
    const base = [
      caja(-ancho / 2 + 3, -fondo / 2 + 3, 0, ancho / 2 - 3, yFrenteCuerpo(e, true), 8, 'cuerpo'),
      caja(-ancho / 2, -fondo / 2, 8, ancho / 2, yFrenteCuerpo(e, true), alto, 'cuerpo'),
    ]
    if (valorVariante(columnaCocina, e, 'integrado') === 'frigorifico') {
      return [...base, ...frentes(e, 1, 9, alto - 1, 'cuerpo'), ...tiradores(e, 1, alto - 60, 'cuerpo')]
    }
    const [horno] = frentes(e, 1, 85, 145, 'cuerpo')
    return [
      ...base,
      ...frentes(e, 1, 9, 84.8, 'cuerpo'),
      { ...horno, material: 'vidrio', color: '#1f1f1f' },
      ...frentes(e, 1, 145.2, alto - 1, 'cuerpo'),
      ...tiradores(e, 1, 78, 'cuerpo'),
      ...tiradores(e, 1, 148, 'cuerpo'),
    ]
  },
  zonasApertura: (e) => valorVariante(columnaCocina, e, 'integrado') === 'horno' ? puertaAbatibleAbajo(e, 60, 85) : puertasAbatibles(e, 1),
}
